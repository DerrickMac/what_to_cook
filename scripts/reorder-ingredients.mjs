/**
 * Re-orders every recipe's ingredients by first use in the steps, using the
 * `sort-ingredients` Edge Function (Claude Haiku). Idempotent — safe to re-run.
 *
 *   node scripts/reorder-ingredients.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const HH = '11111111-1111-4111-8111-111111111111';
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

await sb.auth.signInAnonymously();
await sb.rpc('join_household', { invite_code_input: 'ADOBO7' });

const { data: recipes, error } = await sb
  .from('recipes')
  .select(
    'id, title, instructions, recipe_ingredients!recipe_ingredients_recipe_id_fkey' +
      '(id, name_text, group_name, quantity_text, component_recipe_id, sort_order)'
  )
  .eq('household_id', HH)
  .order('title');
if (error) throw error;

let changed = 0;
let done = 0;

async function handle(r) {
  const steps = (r.instructions || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const ings = [...r.recipe_ingredients].sort((a, b) => a.sort_order - b.sort_order);
  if (steps.length === 0 || ings.length < 2) return;

  const { data, error: fnErr } = await sb.functions.invoke('sort-ingredients', {
    body: {
      steps,
      ingredients: ings.map((i) => ({
        id: i.id,
        name: [i.group_name, i.name_text].filter(Boolean).join(': '),
      })),
    },
  });
  if (fnErr || !data?.order || data.error) {
    console.warn(`  ! ${r.title}: ${fnErr?.message ?? data?.error ?? 'no order'}`);
    return;
  }

  const before = ings.map((i) => i.id).join(',');
  const after = data.order.join(',');
  if (before === after) return;

  const rows = data.order.map((id, sort_order) => {
    const it = ings.find((x) => x.id === id);
    return {
      id,
      recipe_id: r.id,
      name_text: it.name_text,
      group_name: it.group_name,
      quantity_text: it.quantity_text,
      component_recipe_id: it.component_recipe_id,
      sort_order,
    };
  });
  const { error: upErr } = await sb.from('recipe_ingredients').upsert(rows);
  if (upErr) {
    console.warn(`  ! ${r.title}: upsert ${upErr.message}`);
    return;
  }
  changed++;
}

// small concurrency
const QUEUE = [...recipes];
async function worker() {
  while (QUEUE.length) {
    const r = QUEUE.shift();
    await handle(r);
    if (++done % 25 === 0) console.log(`  ${done}/${recipes.length} (${changed} reordered)`);
  }
}
await Promise.all(Array.from({ length: 5 }, worker));

console.log(`done — ${changed}/${recipes.length} recipes reordered`);
await sb.auth.signOut();
