// Shelby vision — identify groceries in a photo so the pantry can be restocked.
//
// POST { image: "<base64 jpeg/png, no data: prefix>", mediaType?: "image/jpeg" }
//   -> { items: [{ name, category, matchedIngredientId: string | null }] }

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

const SYSTEM = `You identify grocery and pantry items in a photo for a home kitchen app.
List each distinct food product you can see — pantry staples, produce, proteins,
condiments, dairy. Use the item's common name, singular, lower-case unless it is a
brand-specific product the user clearly tracks. Prefer a name from the KNOWN list
when the item matches one. Ignore non-food objects, packaging clutter, and things
you cannot identify with confidence. Assign each a category from exactly:
Produce, Protein, Dairy & eggs, Pantry, Condiments.`;

const TOOL = {
  name: "identify_groceries",
  description: "Return the food items visible in the photo.",
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
          required: ["name", "category", "known_match"],
          properties: {
            name: { type: "string", description: "Common name of the item." },
            category: {
              type: "string",
              enum: ["Produce", "Protein", "Dairy & eggs", "Pantry", "Condiments"],
            },
            known_match: {
              type: "string",
              description: "The exact string from the KNOWN list if this item is one of them, else empty string.",
            },
          },
        },
      },
    },
  },
} as const;

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

    const body = await req.json().catch(() => ({}));
    const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
    const mediaType = typeof body.mediaType === "string" ? body.mediaType : "image/jpeg";
    if (!image) return json({ error: "No image" }, 400);

    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("id, name")
      .order("name")
      .range(0, 4999);
    const known = (ingredients ?? []) as { id: string; name: string }[];
    const byName = new Map(known.map((k) => [k.name.toLowerCase(), k.id]));

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM,
      tools: [TOOL as any],
      tool_choice: { type: "tool", name: "identify_groceries" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            {
              type: "text",
              text:
                `KNOWN (reuse these names when they match):\n` +
                known.map((k) => k.name).join(", ") +
                `\n\nCall identify_groceries with what you see.`,
            },
          ],
        },
      ],
    });

    const block = msg.content.find((b: any) => b.type === "tool_use") as any;
    const raw: any[] = Array.isArray(block?.input?.items) ? block.input.items : [];
    const seen = new Set<string>();
    const items = raw
      .map((it) => {
        const name = String(it?.name ?? "").trim();
        if (!name) return null;
        const km = String(it?.known_match ?? "").trim().toLowerCase();
        const matchedIngredientId = byName.get(km) ?? byName.get(name.toLowerCase()) ?? null;
        const category = ["Produce", "Protein", "Dairy & eggs", "Pantry", "Condiments"].includes(it?.category)
          ? it.category
          : "Pantry";
        return { name, category, matchedIngredientId };
      })
      .filter((x): x is { name: string; category: string; matchedIngredientId: string | null } => {
        if (!x) return false;
        const key = x.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return json({ items });
  } catch (e) {
    console.error("shelby-vision:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
