export type Screen =
  | 'onboarding'
  | 'recipes'
  | 'detail'
  | 'pantry'
  | 'pantryItem'
  | 'plan'
  | 'grocery'
  | 'shelby'
  | 'sequences';

export type Status = 'have' | 'low' | 'out';

/**
 * An aisle is just its name now — the ordered list lives in `pantry_aisles`
 * and is editable from the Pantry screen.
 */
export type Category = string;

export interface Aisle {
  id: string;
  name: string;
  position: number;
}

/** Used only before `pantry_aisles` has loaded, and as the delete fallback. */
export const DEFAULT_AISLES = ['Produce', 'Protein', 'Dairy & eggs', 'Pantry', 'Condiments'];
export const FALLBACK_AISLE = 'Pantry';

export interface Ingredient {
  /** Ingredient name, as written in the recipe. */
  n: string;
  /** Quantity, as written. "for serving" / "to taste" are excluded from the grocery list. */
  q: string;
  /** Another recipe's id — renders as a tappable chip, never plain text. */
  link?: string;
  /** Canonical `ingredients.id`, when the row is linked (most are). */
  ingredientId?: string;
}

export interface RecipeSection {
  name: string;
  items: Ingredient[];
}

/** A countdown attached to one direction step. `label` blank → show the duration. */
export interface StepTimerDef {
  id: string;
  stepIndex: number;
  label: string;
  minutes: number;
  /** 'auto' = seeded from the step text, 'user' = created or edited by hand. */
  source: 'auto' | 'user';
}

export interface Recipe {
  id: string;
  title: string;
  tags: string[];
  fav: boolean;
  /** True while a Shelby draft has not been saved to the cookbook yet. */
  ai?: boolean;
  minutes: number;
  serves: number;
  /** The two circle-mark hues that stand in for photography. */
  hueA: string;
  hueB: string;
  sections: RecipeSection[];
  steps: string[];
  timers: StepTimerDef[];
}

export interface PantryItem {
  /** pantry_items.id */
  id: string;
  /** ingredients.id — the canonical link used everywhere */
  ingredientId: string;
  name: string;
  cat: Category;
  status: Status;
  imageUrl?: string | null;
  brand?: string | null;
}

export interface Sequence {
  id: string;
  name: string;
  /** Ids of cookbook recipes in the run. */
  ids: string[];
  /** Titles of Shelby's unsaved ideas. */
  extras: string[];
  /** Ingredients common to all three. */
  shared: string[];
}

/* ---------------- Shelby ---------------- */

export type ShelbyView = 'menu' | 'restock' | 'cook' | 'invent';

/** One grocery item Shelby spotted in a photo, pending confirmation. */
export interface RestockItem {
  name: string;
  category: string;
  matchedIngredientId: string | null;
  keep: boolean;
}

/** A short run of cookbook recipes Shelby suggests cooking together. */
export interface ShelbySequence {
  reason: string;
  recipeIds: string[];
  shared: string[];
}

export interface CookNowResult {
  headline: string;
  picks: { recipeId: string; why: string }[];
  sequence?: ShelbySequence;
}

export interface InventedRecipe {
  title: string;
  minutes: number;
  serves: number;
  tags: string[];
  sections: RecipeSection[];
  steps: string[];
}

export interface InventResult {
  headline: string;
  why: string;
  recipe: InventedRecipe;
  sequence?: ShelbySequence;
}

export interface Household {
  name: string;
  code: string;
}

export interface ConfirmState {
  kind: 'recipe' | 'sequence' | 'leaveEdit';
  id: string;
  title: string;
  body: string;
  action: string;
  /** For 'leaveEdit' — where to go after discarding. */
  leaveTo?: Screen;
}

/** One row of the stored grocery list (`grocery_list`). */
export interface GroceryRow {
  id: string;
  name: string;
  qty: string | null;
  checked: boolean;
  /** Canonical ingredient, when known — lets a tick flip the pantry to "have". */
  ingredientId: string | null;
  /** The recipe this landed on the list from, if any. */
  fromRecipeId: string | null;
  /** Aisle, resolved from the ingredient (or keyword-guessed). */
  cat: Category;
}
