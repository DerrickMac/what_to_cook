/**
 * Emits an idempotent SQL script that loads the What To Cook fixture cookbook
 * into one household (invite code ADOBO7). Run:  node scripts/gen-seed-sql.mjs
 * then apply the printed SQL to Supabase.
 *
 * The recipe/fridge/plan/sequence data here mirrors src/data/seed.ts.
 */

const HH = '11111111-1111-4111-8111-111111111111';
const TERRACOTTA = '#C0603E', OLIVE = '#6B7A3F', SAFFRON = '#D89B2C', CLAY = '#8A6F3F';

// deterministic uuids so re-running is stable
const rid = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sid = (n) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const iid = (n) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const recipes = [
  { slug: 'adobo', title: 'Chicken Adobo', tags: ['Filipino', 'one-pot', 'weeknight'], fav: true, minutes: 50, serves: 4, hueA: TERRACOTTA, hueB: CLAY,
    sections: [
      { name: 'Braise', items: [
        { n: 'Chicken thighs, bone-in', q: '2 lb' }, { n: 'Cane vinegar', q: '½ cup' }, { n: 'Soy sauce', q: '⅓ cup' },
        { n: 'Garlic, smashed', q: '8 cloves' }, { n: 'Bay leaves', q: '3' }, { n: 'Black peppercorns', q: '1 tsp' } ] },
      { name: 'To finish', items: [ { n: 'Scallions, sliced', q: '2' }, { n: 'Steamed rice', q: 'for serving' } ] } ],
    steps: [
      'Marinate the chicken in vinegar, soy, garlic and pepper for 30 minutes — longer if you have the evening.',
      'Bring it all to a boil uncovered, then lower to a simmer for 30 minutes without stirring.',
      'Fish out the chicken, reduce the sauce until it glosses, then return the chicken to coat.',
      'Scatter scallions. Serve over rice with a spoonful of extra sauce.' ] },
  { slug: 'bulgogi', title: 'Bulgogi', tags: ['Korean', 'quick', 'grill'], fav: true, minutes: 30, serves: 2, hueA: TERRACOTTA, hueB: OLIVE,
    sections: [
      { name: 'Marinade', items: [
        { n: 'Ribeye, thin-sliced', q: '1 lb' }, { n: 'Asian pear, grated', q: '½' }, { n: 'Soy sauce', q: '¼ cup' },
        { n: 'Sesame oil', q: '1 tbsp' }, { n: 'Garlic', q: '4 cloves' }, { n: 'Brown sugar', q: '2 tbsp' } ] },
      { name: 'To serve', items: [
        { n: 'Ginger Scallion Sauce', q: '½ cup', link: 'gss' }, { n: 'Lettuce leaves', q: '1 head' }, { n: 'Short-grain rice', q: '2 cups' } ] } ],
    steps: [
      'Whisk the marinade, then fold the beef through it. Rest 20 minutes at room temperature.',
      'Get a cast-iron pan properly hot. Cook in batches so the beef sears rather than steams.',
      'Char the last batch a shade darker — that pan sugar is the point.',
      'Pile onto rice with lettuce and a spoonful of ginger scallion sauce.' ] },
  { slug: 'curry', title: 'Japanese Curry', tags: ['Japanese', 'one-pot', 'kid-friendly', 'batch'], fav: false, minutes: 60, serves: 4, hueA: CLAY, hueB: SAFFRON,
    sections: [
      { name: 'Curry', items: [
        { n: 'Onions, wedged', q: '2' }, { n: 'Carrots', q: '2' }, { n: 'Potatoes', q: '3' },
        { n: 'Chicken thighs', q: '1 lb' }, { n: 'Curry roux blocks', q: '½ box' }, { n: 'Water', q: '4 cups' } ] },
      { name: 'To serve', items: [ { n: 'Short-grain rice', q: '3 cups' }, { n: 'Fukujinzuke pickles', q: 'to taste' } ] } ],
    steps: [
      'Brown the onions hard — ten minutes longer than feels necessary.',
      'Add chicken, carrot, potato and water. Simmer 25 minutes until the potatoes give.',
      'Off the heat, melt in the roux a block at a time. Simmer five more minutes to thicken.',
      'Serve beside rice, never on top, with pickles.' ] },
  { slug: 'padseeew', title: 'Pad See Ew', tags: ['Thai', 'quick', 'noodles'], fav: false, minutes: 25, serves: 2, hueA: OLIVE, hueB: CLAY,
    sections: [
      { name: 'Sauce', items: [
        { n: 'Oyster sauce', q: '2 tbsp' }, { n: 'Dark soy sauce', q: '1 tbsp' }, { n: 'Palm sugar', q: '1 tsp' }, { n: 'Fish sauce', q: '1 tsp' } ] },
      { name: 'Stir-fry', items: [
        { n: 'Fresh rice noodles', q: '1 lb' }, { n: 'Chinese broccoli', q: '1 bunch' }, { n: 'Eggs', q: '2' }, { n: 'Garlic', q: '3 cloves' } ] } ],
    steps: [
      'Separate the noodles by hand. Cold noodles tear — leave them out for an hour first.',
      'Sear the gai lan stems, push aside, scramble the eggs in the same pan.',
      'Add noodles and sauce. Leave them alone for 30 seconds at a time to catch some char.',
      'Serve with chili vinegar on the side.' ] },
  { slug: 'gss', title: 'Ginger Scallion Sauce', tags: ['sauce', 'make-ahead', 'quick'], fav: false, minutes: 10, serves: 8, hueA: OLIVE, hueB: SAFFRON,
    sections: [
      { name: 'Sauce', items: [
        { n: 'Scallions, thin-sliced', q: '1 bunch' }, { n: 'Ginger, grated', q: '3 in' }, { n: 'Neutral oil', q: '½ cup' }, { n: 'Kosher salt', q: '1 tsp' } ] } ],
    steps: [
      'Combine scallions, ginger and salt in a heatproof bowl.',
      'Heat the oil until it shimmers, then pour it over. It should hiss.',
      'Cool and keep in a jar — it improves for about a week.' ] },
  { slug: 'sinigang', title: 'Sinigang na Baboy', tags: ['Filipino', 'soup', 'weeknight'], fav: false, minutes: 70, serves: 4, hueA: TERRACOTTA, hueB: OLIVE,
    sections: [
      { name: 'Broth', items: [
        { n: 'Pork ribs', q: '1½ lb' }, { n: 'Tamarind soup base', q: '1 packet' }, { n: 'Onion, quartered', q: '1' }, { n: 'Tomatoes', q: '2' } ] },
      { name: 'Vegetables', items: [
        { n: 'Daikon, sliced', q: '1' }, { n: 'Long beans', q: '8' }, { n: 'Water spinach', q: '1 bunch' }, { n: 'Long green chilies', q: '2' } ] } ],
    steps: [
      'Simmer the pork with onion and tomato for 45 minutes, skimming.',
      'Add tamarind base and daikon; cook until the daikon is translucent.',
      'Long beans first, water spinach last — it wilts in under a minute.',
      'Taste for sour. It should make you sit up.' ] },
  { slug: 'misosalmon', title: 'Miso Butter Salmon', tags: ['Japanese', 'quick', 'weeknight'], fav: true, minutes: 20, serves: 2, hueA: TERRACOTTA, hueB: SAFFRON,
    sections: [
      { name: 'Glaze', items: [
        { n: 'White miso', q: '2 tbsp' }, { n: 'Butter, soft', q: '2 tbsp' }, { n: 'Mirin', q: '1 tbsp' }, { n: 'Honey', q: '1 tsp' } ] },
      { name: 'To serve', items: [
        { n: 'Salmon fillets', q: '2' }, { n: 'Ginger Scallion Sauce', q: '2 tbsp', link: 'gss' }, { n: 'Short-grain rice', q: '2 cups' } ] } ],
    steps: [
      'Mash the glaze smooth and spread it thick over dry salmon fillets.',
      'Broil 7–8 minutes until the top blisters in spots.',
      'Rice, salmon, a spoon of ginger scallion sauce. Done in twenty.' ] },
  { slug: 'pancit', title: 'Pancit Bihon', tags: ['Filipino', 'noodles', 'party'], fav: false, minutes: 40, serves: 6, hueA: CLAY, hueB: OLIVE,
    sections: [
      { name: 'Noodles', items: [
        { n: 'Bihon rice noodles', q: '12 oz' }, { n: 'Chicken stock', q: '3 cups' }, { n: 'Soy sauce', q: '3 tbsp' } ] },
      { name: 'Stir-fry', items: [
        { n: 'Chicken thigh, shredded', q: '½ lb' }, { n: 'Cabbage, shredded', q: '¼ head' }, { n: 'Carrots, julienned', q: '2' },
        { n: 'Garlic', q: '5 cloves' }, { n: 'Scallions', q: '3' }, { n: 'Calamansi', q: '4' } ] } ],
    steps: [
      'Soak the bihon 10 minutes, no longer.',
      'Fry garlic and chicken, then the vegetables, keeping everything crisp.',
      'Add stock and soy, then the noodles, tossing until the liquid is gone.',
      'Serve with calamansi halves — the squeeze is not optional.' ] },
  { slug: 'zucchini', title: 'Zucchini Chickpea Salad', tags: ['vegetarian', 'no-cook', 'quick'], fav: false, minutes: 15, serves: 2, hueA: OLIVE, hueB: SAFFRON,
    sections: [
      { name: 'Salad', items: [
        { n: 'Zucchini, shaved', q: '2' }, { n: 'Chickpeas', q: '1 can' }, { n: 'Olive oil', q: '3 tbsp' },
        { n: 'Garlic, grated', q: '1 clove' }, { n: 'Lemon', q: '1' }, { n: 'Basil', q: '1 handful' } ] } ],
    steps: [
      'Shave the zucchini on a peeler and salt it for 10 minutes; pat dry.',
      'Toss with chickpeas, oil, garlic and lemon.',
      'Tear the basil in at the last second.' ] },
  { slug: 'chickpeatomato', title: 'Chickpea Salad, Tomato Dressing', tags: ['vegetarian', 'no-cook', 'quick'], fav: false, minutes: 15, serves: 2, hueA: TERRACOTTA, hueB: CLAY,
    sections: [
      { name: 'Salad', items: [
        { n: 'Chickpeas', q: '1 can' }, { n: 'Ripe tomatoes, grated', q: '3' }, { n: 'Olive oil', q: '3 tbsp' },
        { n: 'Garlic, grated', q: '1 clove' }, { n: 'Red onion', q: '½' }, { n: 'Basil', q: '1 handful' } ] } ],
    steps: [
      'Grate the tomatoes on a box grater and discard the skins.',
      'Season the tomato water hard — it is the whole dressing.',
      'Fold in chickpeas and onion, rest 10 minutes, then basil.' ] },
];

const fridge = [
  { name: 'Scallions', cat: 'Produce', status: 'low' }, { name: 'Garlic', cat: 'Produce', status: 'have' },
  { name: 'Ginger', cat: 'Produce', status: 'have' }, { name: 'Basil', cat: 'Produce', status: 'low' },
  { name: 'Zucchini', cat: 'Produce', status: 'have' }, { name: 'Tomatoes', cat: 'Produce', status: 'out' },
  { name: 'Chicken thighs', cat: 'Protein', status: 'have' }, { name: 'Ribeye, sliced', cat: 'Protein', status: 'out' },
  { name: 'Salmon fillets', cat: 'Protein', status: 'have' }, { name: 'Eggs', cat: 'Dairy & eggs', status: 'have' },
  { name: 'Butter', cat: 'Dairy & eggs', status: 'low' }, { name: 'Soy sauce', cat: 'Pantry', status: 'have' },
  { name: 'Cane vinegar', cat: 'Pantry', status: 'have' }, { name: 'Chickpeas', cat: 'Pantry', status: 'have' },
  { name: 'Short-grain rice', cat: 'Pantry', status: 'low' }, { name: 'White miso', cat: 'Condiments', status: 'have' },
  { name: 'Sesame oil', cat: 'Condiments', status: 'have' }, { name: 'Fish sauce', cat: 'Condiments', status: 'out' },
];

// weekday index (Mon=0) -> recipe slug
const plan = [
  ['Mon', 'dinner', 'curry'], ['Tue', 'lunch', 'zucchini'], ['Tue', 'dinner', 'misosalmon'],
  ['Wed', 'breakfast', 'gss'], ['Wed', 'lunch', 'chickpeatomato'], ['Wed', 'dinner', 'adobo'],
  ['Thu', 'dinner', 'padseeew'], ['Fri', 'dinner', 'bulgogi'], ['Sat', 'lunch', 'pancit'], ['Sun', 'dinner', 'sinigang'],
];
const DOW = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const sequences = [
  { title: 'Chickpea week', ids: ['zucchini', 'chickpeatomato'], extras: ['Basil Oil Toast'], shared: ['chickpeas', 'olive oil', 'garlic'] },
  { title: 'Adobo aftermath', ids: ['adobo', 'pancit'], extras: ['Garlic Fried Rice'], shared: ['garlic', 'soy sauce', 'scallions'] },
];

/* ---------------- emit ---------------- */

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (xs) => `ARRAY[${xs.map(q).join(', ')}]::text[]`;
const slugToId = new Map(recipes.map((r, i) => [r.slug, rid(i)]));

const lines = [];
lines.push(`delete from public.households where id = ${q(HH)};`);
lines.push(`insert into public.households (id, name, invite_code) values (${q(HH)}, 'Flat 3 Kitchen', 'ADOBO7');`);
lines.push('');

// ingredients (only what the fridge needs)
fridge.forEach((f, i) => {
  lines.push(
    `insert into public.ingredients (id, name, category, tracking_mode) values (${q(iid(i))}, ${q(f.name)}, ${q(f.cat)}, 'status') ` +
      `on conflict (name) do update set category = excluded.category;`
  );
});
lines.push('');

// all recipes first (component_recipe_id FKs need every recipe to exist)
recipes.forEach((r, i) => {
  lines.push(
    `insert into public.recipes (id, household_id, title, tags, is_favorite, minutes, serves, hue_a, hue_b, instructions) values (` +
      `${q(rid(i))}, ${q(HH)}, ${q(r.title)}, ${arr(r.tags.map((t) => t.toLowerCase()))}, ${r.fav}, ${r.minutes}, ${r.serves}, ${q(r.hueA)}, ${q(r.hueB)}, ${q(r.steps.join('\n'))});`
  );
});
lines.push('');

// then every recipe's ingredient lines
recipes.forEach((r, i) => {
  let so = 0;
  r.sections.forEach((sec) => {
    sec.items.forEach((it) => {
      const comp = it.link ? q(slugToId.get(it.link)) : 'null';
      lines.push(
        `insert into public.recipe_ingredients (recipe_id, group_name, name_text, quantity_text, component_recipe_id, sort_order) values (` +
          `${q(rid(i))}, ${q(sec.name)}, ${q(it.n)}, ${q(it.q)}, ${comp}, ${so++});`
      );
    });
  });
});
lines.push('');

// fridge_items
fridge.forEach((f, i) => {
  lines.push(
    `insert into public.fridge_items (household_id, ingredient_id, status) ` +
      `select ${q(HH)}, id, ${q(f.status)} from public.ingredients where name = ${q(f.name)} ` +
      `on conflict (household_id, ingredient_id) do update set status = excluded.status;`
  );
});
lines.push('');

// meal_plan (anchored to the Monday of the week it is applied)
plan.forEach(([day, meal, slug]) => {
  lines.push(
    `insert into public.meal_plan (household_id, date, meal_type, recipe_id) values (` +
      `${q(HH)}, (date_trunc('week', current_date)::date + ${DOW[day]}), ${q(meal)}, ${q(slugToId.get(slug))}) ` +
      `on conflict (household_id, date, meal_type) do update set recipe_id = excluded.recipe_id;`
  );
});
lines.push('');

// sequences
sequences.forEach((s, i) => {
  lines.push(
    `insert into public.meal_sequences (id, household_id, title, shared, extras) values (` +
      `${q(sid(i))}, ${q(HH)}, ${q(s.title)}, ${arr(s.shared)}, ${arr(s.extras)});`
  );
  s.ids.forEach((slug, pos) => {
    lines.push(
      `insert into public.meal_sequence_recipes (sequence_id, recipe_id, position) values (${q(sid(i))}, ${q(slugToId.get(slug))}, ${pos});`
    );
  });
});
console.log(lines.join('\n'));
