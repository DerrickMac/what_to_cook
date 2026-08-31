/**
 * End-to-end check against the live project: anon sign-in → join ADOBO7 →
 * read the cookbook the way the app does.  node scripts/smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { data: auth, error: authErr } = await supabase.auth.signInAnonymously();
if (authErr) {
  console.error('anon sign-in failed:', authErr.message);
  process.exit(1);
}
console.log('signed in anon:', auth.user?.id);

const { data: hh, error: joinErr } = await supabase.rpc('join_household', {
  invite_code_input: 'ADOBO7',
});
if (joinErr) {
  console.error('join_household failed:', joinErr.message);
  process.exit(1);
}
console.log('joined household:', hh);

const { data: recipes, error: rErr } = await supabase
  .from('recipes')
  .select('id, title, minutes, is_favorite, recipe_ingredients!recipe_ingredients_recipe_id_fkey(name_text, group_name, component_recipe_id, sort_order)')
  .order('title');
if (rErr) { console.error('recipes read failed:', rErr.message); process.exit(1); }

const { data: fridge } = await supabase
  .from('pantry_items')
  .select('status, ingredient:ingredients(name, category)');

const { data: aisles } = await supabase.from('pantry_aisles').select('name, position').order('position');
const { data: queue } = await supabase.from('cook_queue').select('recipe_id, added_at');
const { data: grocery } = await supabase.from('grocery_list').select('item_name, is_checked, ingredient_id, from_recipe_id');
const { data: seqs } = await supabase
  .from('meal_sequences')
  .select('title, shared, extras, meal_sequence_recipes(recipe_id, position)');

console.log('\nrecipes:', recipes.length);
console.log('  e.g.', recipes[0].title, '—', recipes[0].recipe_ingredients.length, 'ingredients');
const linked = recipes.flatMap((r) => r.recipe_ingredients).filter((i) => i.component_recipe_id);
console.log('  linked-recipe ingredients:', linked.length);
console.log('pantry items:', fridge?.length, '| first:', fridge?.[0]?.ingredient?.name, fridge?.[0]?.ingredient?.category);
console.log('aisles:', aisles?.map((a) => a.name).join(', '));
console.log('cook queue:', queue?.length, '| grocery list:', grocery?.length);
console.log('sequences:', seqs?.length, '|', seqs?.map((s) => `${s.title} (${s.meal_sequence_recipes.length})`).join(', '));

// Shelby — cook_now
console.log('\nShelby · cook_now…');
{
  const { data, error } = await supabase.functions.invoke('shelby', {
    body: { mode: 'cook_now', craving: 'something with noodles' },
  });
  if (error || data?.error) console.error('  failed:', error?.message ?? data?.error);
  else {
    console.log('  headline:', data.headline);
    console.log('  picks:', data.picks.map((p) => recipes.find((r) => r.id === p.recipeId)?.title ?? p.recipeId).join(', '));
    console.log('  sequence:', data.sequence ? data.sequence.recipeIds.length + ' recipes' : '(none)');
  }
}

// Shelby — invent
console.log('\nShelby · invent…');
{
  const { data, error } = await supabase.functions.invoke('shelby', { body: { mode: 'invent' } });
  if (error || data?.error) console.error('  failed:', error?.message ?? data?.error);
  else console.log('  recipe:', data.recipe?.title, '·', data.recipe?.sections?.[0]?.items?.length, 'ingredients ·', data.recipe?.steps?.length, 'steps');
}

await supabase.auth.signOut();
console.log('\nOK');
