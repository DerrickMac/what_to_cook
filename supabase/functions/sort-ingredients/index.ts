// Returns a recipe's ingredient ids in the order each is first used in the steps.
//
// POST { steps: string[], ingredients: { id: string; name: string }[] }
//   -> { order: string[] }   (a permutation of the input ids)
//
// Needs the ANTHROPIC_API_KEY secret. verify_jwt is on.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.122.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const TOOL = {
  name: "ordered_ingredients",
  description: "List every ingredient id exactly once, in the order the ingredient is first used in the directions.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["order"],
    properties: {
      order: {
        type: "array",
        items: { type: "string" },
        description: "Ingredient ids. Earliest-used first. Ingredients never named in the steps go last, keeping their original order.",
      },
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

    const { steps, ingredients } = await req.json();
    const ids: string[] = (ingredients ?? []).map((i: { id: string }) => i.id);
    if (!Array.isArray(steps) || ids.length < 2) return json({ order: ids });

    const prompt = [
      "DIRECTIONS:",
      ...steps.map((s: string, i: number) => `${i + 1}. ${s}`),
      "",
      "INGREDIENTS (id — name):",
      ...ingredients.map((i: { id: string; name: string }) => `${i.id} — ${i.name}`),
      "",
      "Return every id once, ordered by the step in which that ingredient is first used.",
      "Match on meaning, not keywords: 'oyster sauce' is not introduced by the word 'sauce' in \"make the sauce\".",
      "Ingredients that are never actually used in a step go at the end in their original order.",
    ].join("\n");

    const anthropic = new Anthropic({ apiKey: key });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      tools: [TOOL as any],
      tool_choice: { type: "tool", name: "ordered_ingredients" },
      messages: [{ role: "user", content: prompt }],
    });

    const block = msg.content.find((b: any) => b.type === "tool_use") as any;
    const got: string[] = Array.isArray(block?.input?.order) ? block.input.order : [];

    // keep only valid ids, append any the model dropped, in original order
    const valid = new Set(ids);
    const seen = new Set<string>();
    const order = got.filter((x) => valid.has(x) && !seen.has(x) && seen.add(x));
    for (const id of ids) if (!seen.has(id)) order.push(id);

    return json({ order });
  } catch (e) {
    console.error("sort-ingredients:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
