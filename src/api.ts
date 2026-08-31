import { supabase } from './lib/supabase';
import { aisle as guessAisle } from './lib/derive';
import { TERRACOTTA, SAFFRON } from './data/seed';
import { FALLBACK_AISLE } from './types';
import type {
  Aisle,
  Category,
  CookNowResult,
  PantryItem,
  GroceryRow,
  Household,
  Ingredient,
  InventResult,
  Recipe,
  RecipeSection,
  RestockItem,
  Sequence,
  Status,
  StepTimerDef,
} from './types';

/**
 * ============================ DATA LAYER ============================
 * The single seam between the UI and Supabase. Every function returns
 * exactly the shape the screens already render, so no call site cares
 * that the database is normalized very differently underneath:
 *
 *   recipes          -> recipes + recipe_ingredients (grouped, ordered)
 *   pantry           -> pantry_items + ingredients
 *   aisles           -> pantry_aisles (shared, ordered, editable)
 *   cook queue       -> cook_queue ("Cooking soon")
 *   grocery list     -> grocery_list (stored, ingredient-aware)
 *   sequences        -> meal_sequences + meal_sequence_recipes
 *
 * Auth is anonymous: a device signs in silently and is then gated on
 * household membership, exactly like the original local-state gate.
 * Mutations stay fire-and-forget; the store updates local state first.
 * ==================================================================
 */

let householdId: string | null = null;

export function getHouseholdId(): string | null {
  return householdId;
}

function requireHousehold(): string {
  if (!householdId) throw new Error('No household loaded yet');
  return householdId;
}

/* ---------------- Auth + household ---------------- */

async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(
      `Anonymous sign-in failed — enable it in Supabase → Authentication → Sign In / Providers. (${error.message})`
    );
  }
}

async function householdMeta(id: string): Promise<Household> {
  const { data } = await supabase
    .from('households')
    .select('name, invite_code')
    .eq('id', id)
    .single();
  return { name: data?.name ?? 'Our Kitchen', code: data?.invite_code ?? '' };
}

/** Silent sign-in, then resolve the caller's household (or null → onboarding). */
export async function init(): Promise<Household | null> {
  await ensureSession();
  const { data } = await supabase
    .from('household_members')
    .select('household:households(id, name, invite_code)')
    .order('created_at', { ascending: false }) // most recently joined wins
    .limit(1)
    .maybeSingle();
  const h = data?.household as
    | { id: string; name: string; invite_code: string | null }
    | undefined;
  if (!h) return null;
  householdId = h.id;
  return { name: h.name, code: h.invite_code ?? '' };
}

export async function createHousehold(name: string): Promise<Household> {
  await ensureSession();
  const { data, error } = await supabase.rpc('create_household', { household_name: name });
  if (error || !data) throw error ?? new Error('create_household returned nothing');
  householdId = data;
  return householdMeta(data);
}

export async function joinHousehold(code: string): Promise<Household> {
  await ensureSession();
  const { data, error } = await supabase.rpc('join_household', {
    invite_code_input: code.trim(),
  });
  if (error || !data) throw error ?? new Error('Invalid invite code');
  householdId = data;
  return householdMeta(data);
}

/* ---------------- Reads ---------------- */

type IngredientRow = {
  group_name: string | null;
  name_text: string | null;
  quantity_text: string | null;
  component_recipe_id: string | null;
  ingredient_id: string | null;
  sort_order: number;
};

function buildSections(rows: IngredientRow[]): RecipeSection[] {
  const order: string[] = [];
  const groups = new Map<string, Ingredient[]>();
  [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((r) => {
      const name = r.group_name || 'Ingredients';
      if (!groups.has(name)) {
        groups.set(name, []);
        order.push(name);
      }
      const item: Ingredient = { n: r.name_text ?? '', q: r.quantity_text ?? '' };
      if (r.component_recipe_id) item.link = r.component_recipe_id;
      if (r.ingredient_id) item.ingredientId = r.ingredient_id;
      groups.get(name)!.push(item);
    });
  return order.map((name) => ({ name, items: groups.get(name)! }));
}

type TimerRow = {
  id: string;
  step_index: number;
  label: string | null;
  minutes: number;
  source: string | null;
  position: number;
};

type RecipeRow = {
  id: string;
  title: string;
  tags: string[] | null;
  is_favorite: boolean;
  minutes: number | null;
  serves: number | null;
  hue_a: string | null;
  hue_b: string | null;
  instructions: string | null;
  recipe_ingredients: IngredientRow[] | null;
  recipe_step_timers: TimerRow[] | null;
};

function mapTimers(rows: TimerRow[]): StepTimerDef[] {
  return [...rows]
    .sort((a, b) => a.step_index - b.step_index || a.position - b.position)
    .map((t) => ({
      id: t.id,
      stepIndex: t.step_index,
      label: t.label ?? '',
      minutes: Number(t.minutes),
      source: t.source === 'auto' ? 'auto' : 'user',
    }));
}

function mapRecipe(r: RecipeRow): Recipe {
  return {
    id: r.id,
    title: r.title,
    tags: r.tags ?? [],
    fav: r.is_favorite,
    minutes: r.minutes ?? 0,
    serves: r.serves ?? 0,
    hueA: r.hue_a ?? TERRACOTTA,
    hueB: r.hue_b ?? SAFFRON,
    sections: buildSections(r.recipe_ingredients ?? []),
    steps: (r.instructions ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    timers: mapTimers(r.recipe_step_timers ?? []),
  };
}

export async function fetchRecipes(): Promise<Recipe[]> {
  if (!householdId) return [];
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, title, tags, is_favorite, minutes, serves, hue_a, hue_b, instructions,' +
        ' recipe_ingredients!recipe_ingredients_recipe_id_fkey' +
        '(group_name, name_text, quantity_text, component_recipe_id, ingredient_id, sort_order),' +
        ' recipe_step_timers!recipe_step_timers_recipe_id_fkey(id, step_index, label, minutes, source, position)'
    )
    .eq('household_id', householdId)
    .order('title', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RecipeRow[]).map(mapRecipe);
}

/* Step timers are edited inside the recipe draft and committed together in
   `replaceStepTimers` (see below), so there are no per-timer endpoints. */

export async function fetchPantryItems(): Promise<PantryItem[]> {
  if (!householdId) return [];
  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, ingredient_id, status, ingredient:ingredients(name, category, image_url, preferred_brand)')
    .eq('household_id', householdId);
  if (error) throw error;
  type Row = {
    id: string;
    ingredient_id: string;
    status: string | null;
    ingredient: { name: string; category: string | null; image_url: string | null; preferred_brand: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .map(
      (row): PantryItem => ({
        id: row.id,
        ingredientId: row.ingredient_id,
        name: row.ingredient?.name ?? '',
        cat: row.ingredient?.category ?? FALLBACK_AISLE,
        status: (row.status as Status) ?? 'out',
        imageUrl: row.ingredient?.image_url ?? null,
        brand: row.ingredient?.preferred_brand ?? null,
      })
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------------- Aisles ---------------- */

export async function fetchAisles(): Promise<Aisle[]> {
  const { data, error } = await supabase
    .from('pantry_aisles')
    .select('id, name, position')
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addAisle(name: string): Promise<Aisle> {
  const clean = name.trim();
  const { data: last } = await supabase
    .from('pantry_aisles')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from('pantry_aisles')
    .insert({ name: clean, position: (last?.position ?? -1) + 1 })
    .select('id, name, position')
    .single();
  if (error) throw error;
  return data;
}

export async function renameAisle(id: string, from: string, to: string): Promise<void> {
  const clean = to.trim();
  if (!clean || clean === from) return;
  const a = await supabase.from('pantry_aisles').update({ name: clean }).eq('id', id);
  if (a.error) throw a.error;
  const b = await supabase.from('ingredients').update({ category: clean }).eq('category', from);
  if (b.error) throw b.error;
}

/** Move every ingredient in `name` to `fallback`, then drop the aisle. */
export async function deleteAisle(id: string, name: string, fallback: string): Promise<void> {
  const a = await supabase.from('ingredients').update({ category: fallback }).eq('category', name);
  if (a.error) throw a.error;
  const b = await supabase.from('pantry_aisles').delete().eq('id', id);
  if (b.error) throw b.error;
}

export async function reorderAisles(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) => supabase.from('pantry_aisles').update({ position: i }).eq('id', id))
  );
}

/* ---------------- Cook queue ---------------- */

export async function fetchCookQueue(): Promise<string[]> {
  if (!householdId) return [];
  const { data, error } = await supabase
    .from('cook_queue')
    .select('recipe_id, added_at')
    .eq('household_id', householdId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.recipe_id);
}

export async function addToCookQueue(recipeId: string): Promise<void> {
  const hh = requireHousehold();
  const { error } = await supabase
    .from('cook_queue')
    .upsert({ household_id: hh, recipe_id: recipeId }, { onConflict: 'household_id,recipe_id' });
  if (error) throw error;
}

export async function removeFromCookQueue(recipeId: string): Promise<void> {
  const hh = requireHousehold();
  const { error } = await supabase
    .from('cook_queue')
    .delete()
    .eq('household_id', hh)
    .eq('recipe_id', recipeId);
  if (error) throw error;
}

/* ---------------- Grocery list (stored) ---------------- */

type GroceryDbRow = {
  id: string;
  item_name: string;
  quantity: string | null;
  is_checked: boolean;
  ingredient_id: string | null;
  from_recipe_id: string | null;
  ingredient: { category: string | null } | null;
};

function mapGrocery(r: GroceryDbRow): GroceryRow {
  return {
    id: r.id,
    name: r.item_name,
    qty: r.quantity,
    checked: r.is_checked,
    ingredientId: r.ingredient_id,
    fromRecipeId: r.from_recipe_id,
    cat: r.ingredient?.category ?? guessAisle(r.item_name, []),
  };
}

export async function fetchGrocery(): Promise<GroceryRow[]> {
  if (!householdId) return [];
  const { data, error } = await supabase
    .from('grocery_list')
    .select('id, item_name, quantity, is_checked, ingredient_id, from_recipe_id, ingredient:ingredients(category)')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as GroceryDbRow[]).map(mapGrocery);
}

export interface GroceryInput {
  name: string;
  qty?: string | null;
  ingredientId?: string | null;
  fromRecipeId?: string | null;
}

/** Insert rows, skipping any whose ingredient/name is already on the list. */
export async function addGroceryItems(items: GroceryInput[]): Promise<GroceryRow[]> {
  const hh = requireHousehold();
  if (!items.length) return [];
  const existing = await fetchGrocery();
  const haveIds = new Set(existing.filter((r) => r.ingredientId).map((r) => r.ingredientId));
  const haveNames = new Set(existing.map((r) => r.name.toLowerCase()));
  const fresh = items.filter((it) =>
    it.ingredientId ? !haveIds.has(it.ingredientId) : !haveNames.has(it.name.trim().toLowerCase())
  );
  if (!fresh.length) return [];
  const { data, error } = await supabase
    .from('grocery_list')
    .insert(
      fresh.map((it) => ({
        household_id: hh,
        item_name: it.name.trim(),
        quantity: it.qty ?? null,
        ingredient_id: it.ingredientId ?? null,
        from_recipe_id: it.fromRecipeId ?? null,
      }))
    )
    .select('id, item_name, quantity, is_checked, ingredient_id, from_recipe_id, ingredient:ingredients(category)');
  if (error) throw error;
  return ((data ?? []) as unknown as GroceryDbRow[]).map(mapGrocery);
}

export async function setGroceryChecked(id: string, checked: boolean): Promise<void> {
  const { error } = await supabase.from('grocery_list').update({ is_checked: checked }).eq('id', id);
  if (error) throw error;
}

export async function deleteGroceryItem(id: string): Promise<void> {
  const { error } = await supabase.from('grocery_list').delete().eq('id', id);
  if (error) throw error;
}

export async function clearCheckedGrocery(): Promise<void> {
  const hh = requireHousehold();
  const { error } = await supabase
    .from('grocery_list')
    .delete()
    .eq('household_id', hh)
    .eq('is_checked', true);
  if (error) throw error;
}

export async function fetchSequences(): Promise<Sequence[]> {
  if (!householdId) return [];
  const { data, error } = await supabase
    .from('meal_sequences')
    .select('id, title, shared, extras, meal_sequence_recipes(recipe_id, position)')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  type Row = {
    id: string;
    title: string;
    shared: string[] | null;
    extras: string[] | null;
    meal_sequence_recipes: { recipe_id: string; position: number }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.title,
    ids: [...(row.meal_sequence_recipes ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((r) => r.recipe_id),
    extras: row.extras ?? [],
    shared: row.shared ?? [],
  }));
}

/* ---------------- Shelby ----------------
 * Three jobs, all through the `shelby` / `shelby-vision` Edge Functions
 * (Claude Haiku 4.5), each reading the household's live pantry + cookbook:
 *   cook_now  — rank cookbook recipes the pantry can make
 *   invent    — design one new recipe around the pantry
 *   vision    — identify groceries in a photo, to restock the pantry
 */

async function invokeShelby<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('shelby', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function shelbyCookNow(craving: string, attempt = 0): Promise<CookNowResult> {
  return invokeShelby<CookNowResult>({ mode: 'cook_now', craving, attempt });
}

export async function shelbyInvent(craving: string, attempt = 0): Promise<InventResult> {
  return invokeShelby<InventResult>({ mode: 'invent', craving, attempt });
}

export async function shelbyIdentify(
  imageBase64: string,
  mediaType: string
): Promise<RestockItem[]> {
  const { data, error } = await supabase.functions.invoke('shelby-vision', {
    body: { image: imageBase64, mediaType },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map(
    (it: { name: string; category: string; matchedIngredientId: string | null }): RestockItem => ({
      name: it.name,
      category: it.category,
      matchedIngredientId: it.matchedIngredientId ?? null,
      keep: true,
    })
  );
}

/* ---------------- Mutations (optimistic; not awaited by callers) ---------------- */

export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  const hh = requireHousehold();
  const { error } = await supabase.from('recipes').upsert({
    id: recipe.id,
    household_id: hh,
    title: recipe.title,
    tags: recipe.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    is_favorite: recipe.fav,
    minutes: recipe.minutes,
    serves: recipe.serves,
    hue_a: recipe.hueA,
    hue_b: recipe.hueB,
    instructions: recipe.steps.join('\n'),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  // Relink to canonical ingredients by name (lookup only — never creates rows),
  // so pantry matching keeps working after an edit.
  const known = new Map((await listIngredients()).map((k) => [k.name.toLowerCase(), k.id]));
  const resolved = recipe.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      ingredientId: item.link
        ? undefined
        : item.ingredientId ?? known.get(item.n.trim().toLowerCase()) ?? undefined,
    })),
  }));

  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
  const rows = resolved.flatMap((section, si) =>
    section.items.map((item, ii) => ({
      recipe_id: recipe.id,
      group_name: section.name,
      name_text: item.n,
      quantity_text: item.q || null,
      component_recipe_id: item.link ?? null,
      ingredient_id: item.ingredientId ?? null,
      sort_order: si * 100 + ii,
    }))
  );
  if (rows.length) await supabase.from('recipe_ingredients').insert(rows);
  return { ...recipe, sections: resolved };
}

/** Replace every step timer for a recipe (used when an inline edit is committed). */
export async function replaceStepTimers(
  recipeId: string,
  timers: { stepIndex: number; label: string; minutes: number }[]
): Promise<void> {
  const del = await supabase.from('recipe_step_timers').delete().eq('recipe_id', recipeId);
  if (del.error) throw del.error;
  if (!timers.length) return;
  const { error } = await supabase.from('recipe_step_timers').insert(
    timers.map((t) => ({
      recipe_id: recipeId,
      step_index: t.stepIndex,
      label: t.label.trim(),
      minutes: t.minutes,
      source: 'user',
    }))
  );
  if (error) throw error;
}

export async function deleteRecipe(id: string): Promise<string> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
  return id;
}

export async function setFavorite(id: string, fav: boolean): Promise<{ id: string; fav: boolean }> {
  const { error } = await supabase.from('recipes').update({ is_favorite: fav }).eq('id', id);
  if (error) throw error;
  return { id, fav };
}

export async function setItemStatus(
  id: string,
  status: Status
): Promise<{ id: string; status: Status }> {
  const { error } = await supabase
    .from('pantry_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return { id, status };
}

/** Set a canonical ingredient's pantry status — from anywhere (recipe rows, Pantry). */
export async function setIngredientStatus(ingredientId: string, status: Status) {
  const hh = requireHousehold();
  const { error } = await supabase
    .from('pantry_items')
    .upsert(
      { household_id: hh, ingredient_id: ingredientId, status, updated_at: new Date().toISOString() },
      { onConflict: 'household_id,ingredient_id' }
    );
  if (error) throw error;
  return { ingredientId, status };
}

/* ---------------- Pantry CRUD ---------------- */

/** Find (case-insensitive) or create a canonical ingredient, then return its row. */
async function findOrCreateIngredient(name: string, category: Category) {
  const clean = name.trim();
  const { data: hit } = await supabase
    .from('ingredients')
    .select('id, name, category, image_url, preferred_brand')
    .ilike('name', clean)
    .limit(1)
    .maybeSingle();
  if (hit) return hit;
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ name: clean, category, tracking_mode: 'status' })
    .select('id, name, category, image_url, preferred_brand')
    .single();
  if (error) throw error;
  return data;
}

export async function addPantryItem(
  name: string,
  category: Category,
  status: Status
): Promise<PantryItem> {
  const hh = requireHousehold();
  const ing = await findOrCreateIngredient(name, category);
  const { data, error } = await supabase
    .from('pantry_items')
    .upsert(
      { household_id: hh, ingredient_id: ing.id, status },
      { onConflict: 'household_id,ingredient_id' }
    )
    .select('id')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    ingredientId: ing.id,
    name: ing.name,
    cat: (ing.category as Category) ?? category,
    status,
    imageUrl: ing.image_url,
    brand: ing.preferred_brand,
  };
}

export async function deletePantryItem(pantryItemId: string): Promise<string> {
  const { error } = await supabase.from('pantry_items').delete().eq('id', pantryItemId);
  if (error) throw error;
  return pantryItemId;
}

export async function updateIngredient(
  ingredientId: string,
  patch: { name?: string; category?: Category }
): Promise<void> {
  const p: { name?: string; category?: string } = {};
  if (patch.name?.trim()) p.name = patch.name.trim();
  if (patch.category) p.category = patch.category;
  if (!Object.keys(p).length) return;
  const { error } = await supabase.from('ingredients').update(p).eq('id', ingredientId);
  if (error) throw error;
}

export async function uploadIngredientPhoto(ingredientId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${ingredientId}/${Date.now()}.${ext}`;
  const up = await supabase.storage
    .from('ingredient-photos')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
  if (up.error) throw up.error;
  const url = supabase.storage.from('ingredient-photos').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('ingredients').update({ image_url: url }).eq('id', ingredientId);
  if (error) throw error;
  return url;
}

/** Every canonical ingredient name + id — for the pantry "add" typeahead. */
export async function listIngredients(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name')
    .order('name')
    .range(0, 4999);
  if (error) throw error;
  return data ?? [];
}

export async function saveSequence(seq: Sequence): Promise<Sequence> {
  const hh = requireHousehold();
  const { error } = await supabase.from('meal_sequences').insert({
    id: seq.id,
    household_id: hh,
    title: seq.name,
    shared: seq.shared,
    extras: seq.extras,
  });
  if (error) throw error;
  if (seq.ids.length) {
    await supabase.from('meal_sequence_recipes').insert(
      seq.ids.map((recipe_id, position) => ({ sequence_id: seq.id, recipe_id, position }))
    );
  }
  return seq;
}

export async function deleteSequence(id: string): Promise<string> {
  const { error } = await supabase.from('meal_sequences').delete().eq('id', id);
  if (error) throw error;
  return id;
}

export async function renameTag(from: string, to: string) {
  const hh = requireHousehold();
  const { error } = await supabase.rpc('rename_household_tag', {
    target_household_id: hh,
    old_tag: from,
    new_tag: to,
  });
  if (error) throw error;
  return { from, to };
}

export async function deleteTag(tag: string): Promise<string> {
  const hh = requireHousehold();
  const { error } = await supabase.rpc('delete_household_tag', {
    target_household_id: hh,
    target_tag: tag,
  });
  if (error) throw error;
  return tag;
}

/* ---------------- Realtime ---------------- */

/**
 * Both partners see the same data, so subscribe to every household-scoped
 * table and re-run the matching fetch on any change. Returns an unsubscribe.
 */
export function subscribeToHousehold(onChange: () => void): () => void {
  if (!householdId) return () => {};
  const hh = householdId;
  const channel = supabase.channel(`household:${hh}`);
  for (const table of ['recipes', 'pantry_items', 'cook_queue', 'grocery_list', 'meal_sequences'] as const) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `household_id=eq.${hh}` },
      () => onChange()
    );
  }
  // recipe_step_timers has no household_id column — RLS still scopes the events.
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'recipe_step_timers' },
    () => onChange()
  );
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
