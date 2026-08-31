/**
 * Step 3: the brand reference + product photos from Junmac's cookbook.
 * Uploads the 11 photos in scripts/pantry-photos/ to Supabase Storage and sets
 * ingredients.image_url + preferred_brand; adds each to the Pantry (status out)
 * if it isn't there already.
 *
 *   node scripts/add-pantry-photos.mjs
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

// photo file -> canonical ingredient, category, brand (from the doc's "Ingredients" table)
const ITEMS = [
  { file: 'thai-fish-sauce.png',                name: 'Thai fish sauce',        cat: 'Condiments', brand: 'Megachef' },
  { file: 'vietnamese-fish-sauce.png',          name: 'Vietnamese fish sauce',  cat: 'Condiments', brand: 'Three Crabs' },
  { file: 'oyster-sauce.png',                   name: 'Oyster sauce',           cat: 'Condiments', brand: 'Lee Kum Kee' },
  { file: 'hoisin-sauce.png',                   name: 'Hoisin sauce',           cat: 'Condiments', brand: 'Lee Kum Kee' },
  { file: 'spicy-bean-sauce-mapo-sauce.png',    name: 'Spicy bean sauce',       cat: 'Condiments', brand: 'Lee Kum Kee' },
  { file: 'spicy-chili-crisp.png',              name: 'Spicy chili crisp',      cat: 'Condiments', brand: 'Laoganma' },
  { file: 'chili-paste-with-soya-bean-oil.png', name: 'Chili paste with soybean oil', cat: 'Condiments', brand: 'Pantai' },
  { file: 'red-curry-paste.png',                name: 'Red curry paste',        cat: 'Condiments', brand: 'Mae Ploy' },
  { file: 's-b-curry-powder.png',               name: 'Curry powder',           cat: 'Pantry',     brand: 'S&B' },
  { file: 'japanese-curry-mix.png',             name: 'Japanese curry mix',     cat: 'Pantry',     brand: 'S&B' },
  { file: 'nanami-togarashi.png',               name: 'Nanami togarashi',       cat: 'Pantry',     brand: 'S&B' },
];

await sb.auth.signInAnonymously();
await sb.rpc('join_household', { invite_code_input: 'ADOBO7' });

const { data: allIng } = await sb.from('ingredients').select('id, name').range(0, 4999);
const byLower = new Map((allIng ?? []).map((i) => [i.name.toLowerCase(), i]));

for (const it of ITEMS) {
  const bytes = readFileSync(new URL(`./pantry-photos/${it.file}`, import.meta.url));
  const path = it.file;
  const up = await sb.storage.from('ingredient-photos').upload(path, bytes, {
    contentType: 'image/png',
    upsert: true,
  });
  if (up.error) die(`upload ${it.file}: ${up.error.message}`);
  const url = sb.storage.from('ingredient-photos').getPublicUrl(path).data.publicUrl;

  let ing = byLower.get(it.name.toLowerCase());
  if (ing) {
    const { error } = await sb
      .from('ingredients')
      .update({ image_url: url, preferred_brand: it.brand, category: it.cat })
      .eq('id', ing.id);
    if (error) die(`update ${it.name}: ${error.message}`);
  } else {
    const { data, error } = await sb
      .from('ingredients')
      .insert({ name: it.name, category: it.cat, tracking_mode: 'status', preferred_brand: it.brand, image_url: url })
      .select('id')
      .single();
    if (error) die(`insert ${it.name}: ${error.message}`);
    ing = { id: data.id, name: it.name };
  }

  const { data: existing } = await sb
    .from('pantry_items')
    .select('id')
    .eq('household_id', HH)
    .eq('ingredient_id', ing.id)
    .maybeSingle();
  if (!existing) {
    await sb.from('pantry_items').insert({ household_id: HH, ingredient_id: ing.id, status: 'out' });
  }
  console.log(`  ${it.name}  ←  ${it.brand}  (${url.split('/').pop()})`);
}

await sb.auth.signOut();
console.log(`done — ${ITEMS.length} photos + brands`);
