// Shelby — pantry-first cooking help.
//
// POST { mode: "cook_now" | "invent", craving?: string, attempt?: number }
//
//   cook_now -> { mode, headline, picks: [{ recipeId, why }],
//                 sequence?: { reason, recipeIds: string[], shared: string[] } }
//   invent   -> { mode, headline, why,
//                 recipe: { title, minutes, serves, tags[], sections[], steps[] },
//                 sequence?: { reason, recipeIds: string[], shared: string[] } }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.122.0";

const MODEL = "claude-haiku-4-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

interface CookbookRecipe {
  id: string;
  title: string;
  minutes: number;
  favorite: boolean;
  tags: string[];
  ingredients: string[];
}

const SYSTEM = `You are Shelby, the cook's assistant in a two-person household app.
You work from what is actually in the pantry. Be warm, concrete, never salesy.
A "sequence" is 2-3 meals cooked across a few days that deliberately share fresh
ingredients so nothing wilts — include one only when the picks genuinely overlap.`;

const COOK_TOOL = {
  name: "recommend_from_pantry",
  description: "Pick cookbook recipes the household can cook with what's on hand.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["headline", "picks"],
    properties: {
      headline: { type: "string", description: "One editorial sentence." },
      picks: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        description: "Best matches first. Only recipes from the provided cookbook.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["recipe_id", "why"],
          properties: {
            recipe_id: { type: "string", description: "Exact id from the cookbook list." },
            why: { type: "string", description: "One short line: what makes it a fit right now." },
          },
        },
      },
      sequence: {
        type: "object",
        additionalProperties: false,
        required: ["reason", "recipe_ids", "shared"],
        properties: {
          reason: { type: "string" },
          recipe_ids: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
          shared: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
        },
      },
    },
  },
} as const;

const INVENT_TOOL = {
  name: "invent_recipe",
  description: "Design ONE new recipe (not in the cookbook) built around the pantry.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["headline", "why", "recipe"],
    properties: {
      headline: { type: "string" },
      why: { type: "string", description: "One or two sentences: why this, from what's on hand." },
      recipe: {
        type: "object",
        additionalProperties: false,
        required: ["title", "minutes", "serves", "tags", "sections", "steps"],
        properties: {
          title: { type: "string" },
          minutes: { type: "integer" },
          serves: { type: "integer" },
          tags: { type: "array", maxItems: 5, items: { type: "string" } },
          sections: {
            type: "array",
            minItems: 1,
            description: "Ingredient groups. Most recipes just need one, named 'Ingredients'.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "items"],
              properties: {
                name: { type: "string" },
                items: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["n", "q"],
                    properties: {
                      n: { type: "string", description: "Ingredient name." },
                      q: { type: "string", description: "Quantity, e.g. '2 tbsp'. May be ''." },
                    },
                  },
                },
              },
            },
          },
          steps: { type: "array", minItems: 2, items: { type: "string", description: "One direction, no number prefix." } },
        },
      },
      sequence: {
        type: "object",
        additionalProperties: false,
        required: ["reason", "recipe_ids", "shared"],
        properties: {
          reason: { type: "string" },
          recipe_ids: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
          shared: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
        },
      },
    },
  },
} as const;

function cookbookLines(cookbook: CookbookRecipe[]): string {
  return cookbook
    .map(
      (r) =>
        `- [${r.id}] ${r.title} (${r.minutes} min${r.favorite ? ", favourite" : ""})` +
        `${r.tags.length ? ` · ${r.tags.join(", ")}` : ""}\n    ${r.ingredients.join(", ")}`,
    )
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ error: "ANTHROPIC_API_KEY is not set" }, 500);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);
    const { data: member } = await supabase
      .from("household_members")
      .select("household_id")
      .limit(1)
      .maybeSingle();
    if (!member) return json({ error: "Not in a household" }, 403);
    const householdId = member.household_id;

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "invent" ? "invent" : "cook_now";
    const craving = typeof body.craving === "string" ? body.craving.trim() : "";
    const attempt = Number.isFinite(body.attempt) ? Number(body.attempt) : 0;

    const [{ data: recipes }, { data: pantry }] = await Promise.all([
      supabase
        .from("recipes")
        .select("id, title, tags, minutes, is_favorite, recipe_ingredients!recipe_ingredients_recipe_id_fkey(name_text)")
        .eq("household_id", householdId),
      supabase.from("pantry_items").select("status, ingredient:ingredients(name)").eq("household_id", householdId),
    ]);
    const cookbook: CookbookRecipe[] = (recipes ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      minutes: r.minutes ?? 0,
      favorite: !!r.is_favorite,
      tags: r.tags ?? [],
      ingredients: (r.recipe_ingredients ?? []).map((i: any) => i.name_text).filter(Boolean),
    }));
    const fr = (pantry ?? []) as any[];
    const haveNow = fr.filter((f) => f.status === "have").map((f) => f.ingredient?.name).filter(Boolean);
    const lowOrOut = fr.filter((f) => f.status !== "have").map((f) => f.ingredient?.name).filter(Boolean);

    const ids = new Set(cookbook.map((r) => r.id));
    const cleanSeq = (s: any) => {
      if (!s) return undefined;
      const recipeIds = (Array.isArray(s.recipe_ids) ? s.recipe_ids : []).map(String).filter((x: string) => ids.has(x));
      if (recipeIds.length < 2) return undefined;
      return {
        reason: String(s.reason ?? ""),
        recipeIds,
        shared: (Array.isArray(s.shared) ? s.shared : []).map(String).slice(0, 5),
      };
    };

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const pantryBlock = [
      `IN THE PANTRY NOW: ${haveNow.join(", ") || "(nothing tracked)"}`,
      `LOW OR OUT: ${lowOrOut.join(", ") || "(none)"}`,
      craving ? `THEY'RE CRAVING: ${craving}` : `No specific craving.`,
      attempt > 0 ? `Another take (#${attempt + 1}) — make it different.` : ``,
    ].join("\n");

    if (mode === "invent") {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2500,
        temperature: attempt > 0 ? 1 : 0.8,
        system: SYSTEM,
        tools: [INVENT_TOOL as any],
        tool_choice: { type: "tool", name: "invent_recipe" },
        messages: [
          {
            role: "user",
            content:
              `${pantryBlock}\n\nTHE COOKBOOK (for the optional sequence only — do NOT re-propose these as the new recipe):\n` +
              cookbookLines(cookbook) +
              `\n\nInvent one new recipe that leans on what's in the pantry. Call invent_recipe.`,
          },
        ],
      });
      const block = msg.content.find((b: any) => b.type === "tool_use") as any;
      const inp = block?.input ?? {};
      const r = inp.recipe ?? {};
      const recipe = {
        title: String(r.title ?? "Pantry supper"),
        minutes: Number.isFinite(r.minutes) ? Math.round(r.minutes) : 25,
        serves: Number.isFinite(r.serves) ? Math.round(r.serves) : 2,
        tags: (Array.isArray(r.tags) ? r.tags : []).map(String).slice(0, 5),
        sections: (Array.isArray(r.sections) ? r.sections : [])
          .map((s: any) => ({
            name: String(s?.name ?? "Ingredients"),
            items: (Array.isArray(s?.items) ? s.items : [])
              .map((it: any) => ({ n: String(it?.n ?? "").trim(), q: String(it?.q ?? "").trim() }))
              .filter((it: any) => it.n),
          }))
          .filter((s: any) => s.items.length),
        steps: (Array.isArray(r.steps) ? r.steps : []).map((s: any) => String(s).trim()).filter(Boolean),
      };
      if (!recipe.sections.length) recipe.sections = [{ name: "Ingredients", items: [] }];
      return json({
        mode: "invent",
        headline: String(inp.headline ?? "Something from what's on hand."),
        why: String(inp.why ?? ""),
        recipe,
        sequence: cleanSeq(inp.sequence),
      });
    }

    // cook_now
    if (cookbook.length === 0) {
      return json({ mode: "cook_now", headline: "Add a few recipes and I'll match them to your pantry.", picks: [] });
    }
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1800,
      temperature: attempt > 0 ? 0.9 : 0.5,
      system: SYSTEM,
      tools: [COOK_TOOL as any],
      tool_choice: { type: "tool", name: "recommend_from_pantry" },
      messages: [
        {
          role: "user",
          content:
            `THE COOKBOOK (use these ids exactly):\n` +
            cookbookLines(cookbook) +
            `\n\n${pantryBlock}\n\nCall recommend_from_pantry with the best matches for tonight.`,
        },
      ],
    });
    const block = msg.content.find((b: any) => b.type === "tool_use") as any;
    const inp = block?.input ?? {};
    const picks = (Array.isArray(inp.picks) ? inp.picks : [])
      .map((p: any) => ({ recipeId: String(p?.recipe_id ?? ""), why: String(p?.why ?? "") }))
      .filter((p: any) => ids.has(p.recipeId));
    return json({
      mode: "cook_now",
      headline: String(inp.headline ?? "Here's what your pantry can cook."),
      picks,
      sequence: cleanSeq(inp.sequence),
    });
  } catch (e) {
    console.error("shelby:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
