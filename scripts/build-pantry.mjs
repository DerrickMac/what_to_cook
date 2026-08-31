/**
 * Steps 1–2 of the canonical-ingredients plan:
 *   1. normalise the 800+ raw recipe ingredient strings -> canonical names
 *      (via the `normalize-ingredients` Edge Function), create `ingredients`
 *      rows, link every `recipe_ingredients` row.
 *   2. add every canonical ingredient to the household Pantry, status 'out'
 *      (existing pantry statuses are kept).
 *
 *   node scripts/build-pantry.mjs
 *
 * Idempotent-ish: re-running re-links and tops the pantry up; it won't reset
 * statuses you've changed.
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
const die = (m) => { console.error(m); process.exit(1); };

await sb.auth.signInAnonymously();
await sb.rpc('join_household', { invite_code_input: 'ADOBO7' });

/* ---------- gather ---------- */

const { data: existing } = await sb.from('ingredients').select('id, name, category');
const canon = new Map(); // lower(name) -> { id, name, category }
for (const i of existing ?? []) canon.set(i.name.toLowerCase(), i);

const mine = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb
    .from('recipe_ingredients')
    .select('id, name_text, group_name, recipe_id, recipes!recipe_ingredients_recipe_id_fkey(household_id)')
    .range(from, from + 999);
  if (error) die('recipe_ingredients read: ' + error.message);
  mine.push(...data.filter((r) => r.recipes?.household_id === HH && r.name_text));
  if (data.length < 1000) break;
}
const isAlt = (r) => /alternativ/i.test(r.group_name || '') || /^(alternativ|optional)/i.test(r.name_text);
const rawSet = [...new Set(mine.filter((r) => !isAlt(r)).map((r) => r.name_text))];
console.log(`${mine.length} ingredient rows, ${rawSet.length} distinct strings to canonicalise`);

/* ---------- 1. normalise ---------- */

const rawToCanon = new Map(); // raw -> { name, category }
for (let i = 0; i < rawSet.length; i += 40) {
  const batch = rawSet.slice(i, i + 40);
  const known = [...new Set([...canon.values()].map((c) => c.name))];
  const { data, error } = await sb.functions.invoke('normalize-ingredients', {
    body: { raw: batch, known },
  });
  if (error || data?.error) die(`normalize [${i}]: ${error?.message ?? data?.error}`);
  for (const raw of batch) {
    const m = data.map[raw];
    const name = (m?.name || raw).replace(/\s+/g, ' ').trim();
    const category = m?.category || 'Pantry';
    rawToCanon.set(raw, { name, category });
    const lc = name.toLowerCase();
    if (!canon.has(lc)) canon.set(lc, { id: null, name, category });
  }
  console.log(`  normalised ${Math.min(i + 40, rawSet.length)}/${rawSet.length} (${canon.size} canonical so far)`);
}

/* ---------- create ingredients ---------- */

const toCreate = [...canon.values()].filter((c) => !c.id);
for (let i = 0; i < toCreate.length; i += 100) {
  const chunk = toCreate.slice(i, i + 100);
  const { data, error } = await sb
    .from('ingredients')
    .upsert(chunk.map((c) => ({ name: c.name, category: c.category, tracking_mode: 'status' })), {
      onConflict: 'name',
    })
    .select('id, name');
  if (error) die('ingredient insert: ' + error.message);
  for (const row of data) {
    const c = canon.get(row.name.toLowerCase());
    if (c) c.id = row.id;
  }
}
// backfill ids for any that already existed by name
{
  const { data } = await sb.from('ingredients').select('id, name');
  for (const row of data ?? []) {
    const c = canon.get(row.name.toLowerCase());
    if (c && !c.id) c.id = row.id;
  }
}
console.log(`${canon.size} canonical ingredients (${toCreate.length} new)`);

/* ---------- link recipe_ingredients ---------- */

let linked = 0;
const byIngredient = new Map(); // ingredient_id -> [recipe_ingredients.id]
for (const r of mine) {
  if (isAlt(r)) continue;
  const c = canon.get((rawToCanon.get(r.name_text)?.name || '').toLowerCase());
  if (c?.id) {
    if (!byIngredient.has(c.id)) byIngredient.set(c.id, []);
    byIngredient.get(c.id).push(r.id);
  }
}
const groups = [...byIngredient.entries()];
for (let i = 0; i < groups.length; i += 20) {
  await Promise.all(
    groups.slice(i, i + 20).map(async ([ingredientId, rowIds]) => {
      for (let j = 0; j < rowIds.length; j += 150) {
        const { error } = await sb
          .from('recipe_ingredients')
          .update({ ingredient_id: ingredientId })
          .in('id', rowIds.slice(j, j + 150));
        if (!error) linked += Math.min(150, rowIds.length - j);
      }
    })
  );
  console.log(`  linked ${Math.min(i + 20, groups.length)}/${groups.length} ingredients`);
}
console.log(`${linked} recipe_ingredients rows linked`);

/* ---------- 2. populate pantry ---------- */

const { data: pantry } = await sb.from('pantry_items').select('ingredient_id').eq('household_id', HH);
const have = new Set((pantry ?? []).map((p) => p.ingredient_id));
const newItems = [...canon.values()]
  .filter((c) => c.id && !have.has(c.id))
  .map((c) => ({ household_id: HH, ingredient_id: c.id, status: 'out' }));

for (let i = 0; i < newItems.length; i += 200) {
  const { error } = await sb.from('pantry_items').insert(newItems.slice(i, i + 200));
  if (error) die('pantry insert: ' + error.message);
}
console.log(`${newItems.length} pantry items added (status out); ${have.size} existing kept`);

await sb.auth.signOut();
console.log('done');
