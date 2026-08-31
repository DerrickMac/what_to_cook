// Maps messy recipe ingredient strings to canonical ingredient names.
//
// POST { raw: string[], known: string[] }
//   -> { map: { <raw>: { name: string, category: string } } }
//
// "keep cuts and brands separate": Chicken thighs / Chicken breasts / Chicken
// are three ingredients; Light soy sauce / Dark soy sauce / Soy sauce are three.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.122.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CATEGORIES = ["Produce", "Protein", "Dairy & eggs", "Pantry", "Condiments"];

const TOOL = {
  name: "canonicalise",
  description: "For each raw ingredient string, give its canonical pantry name and category.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["raw", "name", "category"],
          properties: {
            raw: { type: "string", description: "the input string, verbatim" },
            name: { type: "string", description: "canonical ingredient name, Title Case, singular-ish, no quantities or prep" },
            category: { type: "string", enum: CATEGORIES },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You canonicalise recipe ingredient strings into a shared pantry list.

RULES
- Strip quantities, units, and prep ("2 lb", "minced", "sliced", "to taste"): "4 Garlic cloves, minced" -> "Garlic".
- KEEP cuts, forms and brands distinct: "Chicken thighs" / "Chicken breasts" / "Ground chicken" are separate; "Light soy sauce" / "Dark soy sauce" / "Soy sauce" are separate; "Brown sugar" / "Palm sugar" / "Sugar" are separate.
- "X or Y" -> use X (the first / primary option).
- Drop leading "Optional:" / "Alternative:" / "Alternatives:" but keep the ingredient.
- Reuse a name from the KNOWN list whenever it's the same thing (match case-insensitively, then echo the KNOWN spelling).
- category: Produce (veg, fruit, herbs, aromatics), Protein (meat, fish, tofu, eggs, beans), Dairy & eggs (milk, butter, cheese, cream, yoghurt), Pantry (grains, noodles, flour, sugar, canned, spices, stock), Condiments (sauces, oils, vinegars, pastes, dressings).
- If a string is not an ingredient (a technique note, "for serving", empty) still return it with your best guess.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

    const { raw, known } = await req.json();
    if (!Array.isArray(raw) || raw.length === 0) return json({ map: {} });

    const prompt = [
      known?.length ? `KNOWN canonical names (reuse these when they fit):\n${known.join("\n")}` : "KNOWN canonical names: (none yet)",
      "",
      "RAW strings to canonicalise:",
      ...raw.map((r: string, i: number) => `${i + 1}. ${r}`),
      "",
      "Call canonicalise with one entry per raw string.",
    ].join("\n");

    const anthropic = new Anthropic({ apiKey: key });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8000,
      system: SYSTEM,
      tools: [TOOL as any],
      tool_choice: { type: "tool", name: "canonicalise" },
      messages: [{ role: "user", content: prompt }],
    });

    const block = msg.content.find((b: any) => b.type === "tool_use") as any;
    const items: any[] = Array.isArray(block?.input?.items) ? block.input.items : [];
    const map: Record<string, { name: string; category: string }> = {};
    for (const it of items) {
      if (typeof it?.raw !== "string" || typeof it?.name !== "string") continue;
      const category = CATEGORIES.includes(it.category) ? it.category : "Pantry";
      map[it.raw] = { name: it.name.trim(), category };
    }
    return json({ map });
  } catch (e) {
    console.error("normalize-ingredients:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
