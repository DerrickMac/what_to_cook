import type { Category, Ingredient, PantryItem, Recipe, Status } from '../types';
import { DEFAULT_AISLES, FALLBACK_AISLE } from '../types';
import { SAFFRON, TERRACOTTA } from '../data/seed';

/* ---------------- Status ---------------- */

export const statusColor = (s: Status) =>
  s === 'have' ? 'var(--olive)' : s === 'low' ? 'var(--saffron)' : 'var(--terracotta)';

export const statusTint = (s: Status) =>
  s === 'have' ? 'var(--tint-have)' : s === 'low' ? 'var(--tint-low)' : 'var(--tint-out)';

export const nextStatus = (s: Status): Status =>
  s === 'have' ? 'low' : s === 'low' ? 'out' : 'have';

/* ---------------- Recipe helpers ---------------- */

export const byId = (recipes: Recipe[], id: string | null) =>
  recipes.find((r) => r.id === id);

export const allIngredients = (r: Recipe) =>
  r.sections.flatMap((s) => s.items.map((i) => i.n));

/* ---------------- Pantry match ---------------- */

const STAPLE = /^(salt|pepper|black pepper|white pepper|water|oil|olive oil|vegetable oil|neutral oil|cooking oil|sesame oil|sugar|brown sugar|ice)$/;

/** Reduce an ingredient or pantry-item name to a comparable core noun. */
function core(name: string): string {
  return name
    .toLowerCase()
    .split(/[,(]/)[0]
    .replace(/\b(fresh|dried|ground|minced|chopped|sliced|diced|grated|crushed|large|medium|small|thinly?|whole|raw|cooked|optional|alternatives?|toasted|light|dark)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Genuinely always on hand. Salt / pepper / oil are real pantry items now. */
const ALWAYS = /^(water|ice)$/;

export interface Haves {
  /** ingredient_ids with status have/low */
  ids: Set<string>;
  /** core names, for the ~5% of recipe rows that aren't linked to an ingredient */
  names: Set<string>;
}

/** Reduce the pantry to fast lookup sets, once. */
export function pantryHaves(pantry: PantryItem[], acceptLow = true): Haves {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const p of pantry) {
    if (p.status === 'out') continue;
    if (p.status === 'low' && !acceptLow) continue;
    ids.add(p.ingredientId);
    const c = core(p.name);
    if (c) names.add(c);
  }
  return { ids, names };
}

/** Is this recipe ingredient on hand? */
export function haveIngredient(it: Ingredient, haves: Haves): boolean {
  if (it.ingredientId) return haves.ids.has(it.ingredientId);
  const c = core(it.n);
  if (!c || ALWAYS.test(c) || STAPLE.test(c)) return true;
  if (haves.names.has(c)) return true;
  for (const h of haves.names) if (c.includes(h) || h.includes(c)) return true;
  return false;
}

const countable = (it: Ingredient) =>
  !it.link && !/for serving|to taste|optional|alternativ/i.test(`${it.q} ${it.n}`);

export interface PantryMatch {
  need: number;
  have: number;
  missing: Ingredient[];
}

/** How ready a recipe is against the pantry. */
export function pantryMatch(recipe: Recipe, haves: Haves): PantryMatch {
  const missing: Ingredient[] = [];
  let have = 0;
  recipe.sections.forEach((sec) => {
    if (sec.name && /alternativ/i.test(sec.name)) return;
    sec.items.forEach((it) => {
      if (!countable(it)) return;
      if (haveIngredient(it, haves)) have++;
      else missing.push(it);
    });
  });
  return { need: missing.length, have, missing };
}

/* ---------------- Step timers ---------------- */

const DUR_RE = /\b(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?)\s*)?(min(?:ute)?s?|hours?|hrs?)\b/i;

/** The first timeable duration mentioned in a step, or null. */
export function stepDuration(step: string): { label: string; seconds: number } | null {
  const m = DUR_RE.exec(step);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = m[2] ? parseFloat(m[2]) : lo;
  const isHr = /^h/i.test(m[3]);
  const mins = ((lo + hi) / 2) * (isHr ? 60 : 1);
  if (mins < 1 || mins > 240) return null; // skip "1-7 days", "20 seconds"
  const unit = isHr ? 'hr' : 'min';
  return {
    label: m[2] ? `${m[1]}–${m[2]} ${unit}` : `${m[1]} ${unit}`,
    seconds: Math.round(mins * 60),
  };
}

/* ---------------- Aisles ---------------- */

/**
 * Aisle assignment prefers the matching pantry item's category, then falls
 * back to keyword matching against the default aisle names.
 */
export function aisle(name: string, pantry: PantryItem[]): Category {
  const f = pantry.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (f?.cat) return f.cat;
  const n = name.toLowerCase();
  if (/noodle|rice|flour|sugar|can|chickpea|stock|roux/.test(n)) return 'Pantry';
  if (/pork|beef|chicken|salmon|ribeye|egg/.test(n)) return 'Protein';
  if (/sauce|vinegar|miso|mirin|honey|oil|soup base/.test(n)) return 'Condiments';
  if (/butter|milk|cream/.test(n)) return 'Dairy & eggs';
  return 'Produce';
}

/**
 * Group anything by aisle. `order` is the household's aisle list; any aisle
 * not in it (e.g. a legacy category) still shows, appended alphabetically.
 */
export function groupByCategory<T>(
  items: T[],
  key: (item: T) => Category,
  order: string[] = DEFAULT_AISLES
) {
  const map = new Map<Category, T[]>();
  items.forEach((item) => {
    const k = key(item) || FALLBACK_AISLE;
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  });
  const seen = new Set(order);
  const extras = [...map.keys()].filter((k) => !seen.has(k)).sort((a, b) => a.localeCompare(b));
  return [...order, ...extras]
    .filter((c) => map.has(c))
    .map((name) => {
      const groupItems = map.get(name)!;
      return { name, items: groupItems, count: groupItems.length };
    });
}

/* ---------------- Cook queue ---------------- */

/** The distinct missing ingredients across every queued recipe. */
export function missingForQueue(recipes: Recipe[], haves: Haves): Ingredient[] {
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const r of recipes) {
    for (const it of pantryMatch(r, haves).missing) {
      const dedupeKey = it.ingredientId ?? core(it.n) ?? it.n.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push(it);
    }
  }
  return out;
}

/* ---------------- Tags ---------------- */

/** Sorted by count desc, then alphabetically. */
export function tagCounts(recipes: Recipe[]) {
  const m: Record<string, number> = {};
  recipes.forEach((r) => (r.tags || []).forEach((t) => { m[t] = (m[t] || 0) + 1; }));
  return Object.keys(m)
    .sort((a, b) => m[b] - m[a] || a.localeCompare(b))
    .map((tag) => ({ tag, count: m[tag] }));
}

/* ---------------- Search ---------------- */

/**
 * Filter by the active tag chip first; then, if there's a query, match tags —
 * and *only if no tag matches* fall back to titles and ingredient names.
 * Favourites sort to the front regardless of filter.
 */
export function filterRecipes(recipes: Recipe[], query: string, activeTag: string | null) {
  const q = query.trim().toLowerCase();
  let list = recipes.slice();
  let note = '';

  if (activeTag) {
    list = list.filter((r) => r.tags.includes(activeTag));
    note = 'Tag · ' + activeTag;
  }

  if (q) {
    const tagHits = list.filter((r) => r.tags.some((t) => t.toLowerCase().includes(q)));
    if (tagHits.length) {
      list = tagHits;
      note = 'Matched tags';
    } else {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          allIngredients(r).some((n) => n.toLowerCase().includes(q))
      );
      note = list.length ? 'No tag match — searching titles & ingredients' : '';
    }
  }

  list.sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
  return { list, note };
}

/* ---------------- Recipe editor ---------------- */

/** A blank recipe, opened straight into inline edit mode. */
export function blankRecipe(): Recipe {
  return {
    id: crypto.randomUUID(),
    title: '',
    tags: [],
    fav: false,
    ai: false,
    minutes: 30,
    serves: 2,
    hueA: TERRACOTTA,
    hueB: SAFFRON,
    sections: [{ name: 'Ingredients', items: [{ n: '', q: '' }] }],
    steps: [''],
    timers: [],
  };
}

/** Drop empty rows / sections / steps before saving an edited recipe. */
export function tidyRecipe(r: Recipe): Recipe {
  const sections = r.sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.n.trim()) }))
    .filter((s, i) => s.items.length || (i === 0 && r.sections.length === 1));

  // Steps: drop blanks, and carry each surviving step's timer to its new index.
  const keptSteps: string[] = [];
  const indexMap = new Map<number, number>();
  r.steps.forEach((s, oldIdx) => {
    if (!s.trim()) return;
    indexMap.set(oldIdx, keptSteps.length);
    keptSteps.push(s.trim());
  });
  const timers = r.timers
    .filter((t) => indexMap.has(t.stepIndex))
    .map((t) => ({ ...t, stepIndex: indexMap.get(t.stepIndex)! }));

  return {
    ...r,
    title: r.title.trim() || 'Untitled',
    sections: sections.length ? sections : [{ name: 'Ingredients', items: [] }],
    steps: keptSteps,
    timers,
  };
}

/** "45 min" / "1 hr 15 min" / "2 hr" from a minute count. */
export function fmtDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} hr ${rem} min` : `${h} hr`;
}
