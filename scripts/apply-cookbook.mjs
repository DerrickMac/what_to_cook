/**
 * Loads scripts/cookbook.json into the Flat 3 Kitchen household, replacing every
 * recipe there.  Uses anon auth + the ADOBO7 invite (RLS lets a household member
 * do the full delete + insert).
 *
 *   node scripts/apply-cookbook.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { recipes, household_id } = JSON.parse(
  readFileSync(new URL('./cookbook.json', import.meta.url), 'utf8')
);

const die = (m) => {
  console.error(m);
  process.exit(1);
};

const { error: authErr } = await supabase.auth.signInAnonymously();
if (authErr) die('anon sign-in failed: ' + authErr.message);
const { error: joinErr } = await supabase.rpc('join_household', { invite_code_input: 'ADOBO7' });
if (joinErr) die('join failed: ' + joinErr.message);

console.log(`replacing recipes in ${household_id} with ${recipes.length} from the cookbook…`);
const { error: delErr } = await supabase.from('recipes').delete().eq('household_id', household_id);
if (delErr) die('delete failed: ' + delErr.message);

const recRows = recipes.map((r) => ({
  id: r.id, household_id, title: r.title, tags: r.tags, is_favorite: r.is_favorite,
  is_tried: r.is_tried, minutes: r.minutes, serves: r.serves, servings: r.servings,
  hue_a: r.hue_a, hue_b: r.hue_b, instructions: r.instructions, category: r.category,
  subcategory: r.subcategory, author: r.author, source_url: r.source_url, notes: r.notes,
}));

for (let i = 0; i < recRows.length; i += 100) {
  const { error } = await supabase.from('recipes').insert(recRows.slice(i, i + 100));
  if (error) die(`recipe insert [${i}]: ${error.message}`);
}
console.log(`  ${recRows.length} recipes inserted`);

const ingRows = recipes.flatMap((r) =>
  r.ingredients.map((it) => ({ recipe_id: r.id, ...it }))
);
for (let i = 0; i < ingRows.length; i += 500) {
  const { error } = await supabase.from('recipe_ingredients').insert(ingRows.slice(i, i + 500));
  if (error) die(`ingredient insert [${i}]: ${error.message}`);
}
console.log(`  ${ingRows.length} ingredient rows inserted`);

const { count } = await supabase
  .from('recipes')
  .select('*', { count: 'exact', head: true })
  .eq('household_id', household_id);
console.log(`done — ${count} recipes now in the household`);
await supabase.auth.signOut();
