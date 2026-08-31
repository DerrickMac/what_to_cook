# What To Cook

A mobile-first PWA for a two-person household: one cookbook, one pantry, one plan.
Shelby — the assistant — works from the live pantry: restock it from a photo,
find cookbook recipes you can cook now, or invent a new one around what's on hand.

Built from the design handoff in `design_handoff_what_to_cook/`. React 18 + Vite +
TypeScript, no UI framework, no CSS framework — the design tokens live in one
stylesheet and nothing else invents colour.

## Running it

```bash
npm install
cp env.example .env   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev           # http://localhost:5173
```

The app talks to a live Supabase project (`what_to_cook_db`). Two one-time setup
steps on that project:

1. **Enable anonymous sign-ins** — Authentication → Sign In / Providers →
   *Anonymous sign-ins*. The app signs a device in silently; there is no login UI.
2. **Seed the fixture cookbook** — run `node scripts/gen-seed-sql.mjs` and apply
   the SQL (via the Supabase SQL editor or MCP). It loads one household with
   invite code `ADOBO7`.

On first launch, choose **Join a household** and enter `ADOBO7` (or leave it blank
— that is the default). `node scripts/smoke.mjs` checks the whole path end to end.

The dev server binds to your network too, so you can open it on your phone at
`http://<your-laptop-ip>:5173` and add it to the home screen to see it as a
standalone app. That's the intended way to look at this — it's designed at 390px.

```bash
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve dist/ (service worker only registers here, not in dev)
npm run typecheck
```

## Layout

```
src/
  api.ts                 the ONLY seam to Supabase — every read/write/rpc lives here
  store.tsx              app state + actions (React context)
  types.ts               domain types
  styles.css             design tokens + all shared classes
  data/seed.ts           just the accent hues now (TERRACOTTA / OLIVE / SAFFRON / CLAY)
  lib/supabase.ts        the typed client (reads .env)
  lib/database.types.ts  generated from the live schema
  lib/derive.ts          everything computed, never stored (pantry match, aisle grouping)
  components/            circle marks, tab bar, sheets, dialog
  screens/               one file per screen
public/
  manifest.webmanifest   standalone display, #FBF7F0 theme
  sw.js                  offline reads for recipes/pantry
scripts/
  import-cookbook.py     parses Junmac's Google-Doc cookbook -> cookbook.json + a report
  apply-cookbook.mjs     loads cookbook.json into the household (anon auth + ADOBO7)
  reorder-ingredients.mjs  LLM pass — orders each recipe's ingredients by first use in the steps
  build-pantry.mjs       LLM pass — canonicalises recipe ingredients into `ingredients`,
                         links every recipe_ingredients row, fills the Pantry (status out)
  add-pantry-photos.mjs  uploads the 11 brand photos to Storage, sets image_url + preferred_brand
  backfill-timers.mjs    seeds recipe_step_timers from the "20 minutes" durations in each step
  pantry-photos/         the source PNGs
  cookbook-report.md     what imported cleanly and what didn't
  gen-seed-sql.mjs       the original 10-recipe fixture seed (superseded by the import)
  smoke.mjs              end-to-end check against the live project
```

## The backend

`src/api.ts` is the only seam — it maps the UI shapes to the normalized Supabase
schema and back:

| Hook | Supabase |
|---|---|
| `fetchRecipes` | `recipes` + `recipe_ingredients` (grouped, ordered) + `recipe_step_timers`; `instructions` ⇄ `steps[]`, `hue_a/hue_b` ⇄ `hueA/hueB` |
| `addStepTimer` / `updateStepTimer` / `deleteStepTimer` | `recipe_step_timers` (`recipe_id` + `step_index`; RLS via the parent recipe's household) |
| `fetchPantryItems` | `pantry_items` join `ingredients` |
| `fetchAisles` / `addAisle` / `renameAisle` / `deleteAisle` / `reorderAisles` | `pantry_aisles` (shared, `position`-ordered); rename/delete also rewrite `ingredients.category` |
| `fetchCookQueue` / `addToCookQueue` / `removeFromCookQueue` | `cook_queue` (`household_id, recipe_id` unique, newest first) |
| `fetchGrocery` / `addGroceryItems` / `setGroceryChecked` / `deleteGroceryItem` / `clearCheckedGrocery` | `grocery_list` (stored; `ingredient_id` + `from_recipe_id`); inserts dedupe against the current list |
| `fetchSequences` | `meal_sequences` + `meal_sequence_recipes` (+ the `shared` / `extras` array columns) |
| `saveRecipe` / `deleteRecipe` / `setFavorite` | `recipes` upsert/delete; ingredient rows deleted + re-inserted, re-linked to canonical `ingredient_id` by name |
| `replaceStepTimers` | `recipe_step_timers` — deletes the recipe's timers and inserts the draft's, committed with a recipe save |
| `setItemStatus` / `setIngredientStatus` | `pantry_items` update / upsert on `(household_id, ingredient_id)` |
| `renameTag` / `deleteTag` | `rename_household_tag` / `delete_household_tag` RPCs (tags are stored lower-case) |
| `createHousehold` / `joinHousehold` | the `create_household` / `join_household` RPCs; `init()` resolves membership on load |
| `subscribeToHousehold` | a realtime channel on `recipes`, `pantry_items`, `cook_queue`, `grocery_list`, `meal_sequences`, `recipe_step_timers` |
| `shelbyCookNow` / `shelbyInvent` / `shelbyIdentify` | the `shelby` (`cook_now` / `invent`) and `shelby-vision` Edge Functions — see the Shelby section |

Migrations added for the frontend: `minutes` / `serves` / `hue_a` / `hue_b` on
`recipes`, `name_text` / `sort_order` on `recipe_ingredients` (+ a relaxed
`ingredient_or_component` check so free-text lines are valid), `shared` / `extras`
on `meal_sequences`, `image_url` on `ingredients`, the `pantry_aisles` and
`cook_queue` and `recipe_step_timers` tables, `ingredient_id` / `from_recipe_id`
on `grocery_list`, realtime publication, and a case-insensitive `join_household`.
`meal_plan` was dropped (Phase 3).

Three things that stay true:

**Mutations stay optimistic.** Status cycling, grocery checks, Plan-to-Cook and
favouriting all update local state first and call the hook alongside. The app
should feel instant; reconcile by re-running the matching fetch if a call rejects.
Don't await these in the click handler.

**Shelby responses are server-validated.** The Edge Functions only ever return
cookbook `recipeId`s that exist and `matchedIngredientId`s that resolve; the
client trusts them. Invented recipes are the one thing the model authors freely —
they're vetted by the user before "Add to my recipes" persists them.

**Everything is shared.** Both people see the same data — every mutation is
household-wide and `subscribeToHousehold` re-fetches on any change, so one
person's pantry tap shows up on the other's phone. The only things that don't
persist are Shelby's in-flight results.

## Notes on the implementation

- **Onboarding is gated on real household membership.** `api.init()` signs the
  device in anonymously and looks up `household_members`; the screen never
  reappears once you're in a household.
- **Search precedence is deliberate.** Active tag chip first; then if there's a
  query, match tags — and only if *no* tag matches fall back to titles and
  ingredient names. Favourites sort to the front regardless. See
  `filterRecipes` in `lib/derive.ts`. This is separate from Shelby on purpose.
- **The grocery list is stored (`grocery_list`), not derived.** Plan-to-Cook on a
  recipe adds it to `cook_queue` and inserts its *missing* ingredients (from
  `pantryMatch`) with `ingredient_id` + `from_recipe_id`; inserts dedupe against
  what's already on the list. Ticking a row off flips that canonical ingredient to
  `have`. Manual add and per-row delete are there too.
- **Aisles are data (`pantry_aisles`), not a hardcoded union.** A shared,
  `position`-ordered list, edited from the Pantry header ("Aisles" →
  `AislesSheet`). Rename/delete rewrite `ingredients.category`; delete moves items
  to the aisle above. `groupByCategory(items, key, order)` takes the order and
  still shows any unlisted category, appended alphabetically.
- **Recipe photography is a placeholder.** Overlapping translucent circles with
  `mix-blend-mode: multiply`, in `components/CircleMark.tsx`. The well geometry is
  what to keep when real illustrations land — swap the inner spans, not the wells.
- **`wtc-breathe` is the only ambient animation**, on the Shelby dot alone. Don't
  add more.
- **No Today tab.** Recipes is home; tabs are Recipes · Pantry · Plan · List + the
  Shelby FAB. **Plan** is now "Cooking soon" — the `cook_queue` list with a
  have/need badge per recipe and a combined "Add all to list".
- **"Do I have this?" runs on `ingredient_id`, not strings.** `recipe_ingredients`
  and `pantry_items` both carry a canonical `ingredients.id`. `pantryHaves(pantry)`
  builds a `Set` of ids with status have/low (plus a core-name set for the ~5% of
  rows that aren't linked); `pantryMatch(recipe, haves)` → `{ have, need, missing }`.
  Only water/ice are auto-assumed — salt, pepper, oil are real trackable items now.
- **Recipe detail shows readiness** — a header line ("You have 7 of 9 — 2 to buy")
  and a per-ingredient `<select>` (have / low / to buy) that sets that *canonical*
  ingredient's pantry status via `setIngredientStatus(ingredientId, status)`, so it
  updates the Pantry screen and every other recipe at once.
- Pantry statuses are set from a `<select>` per row, not tap-to-cycle.
- **Cookbook quick-filters** ("Can make now" = 0 missing, "Missing ≤ 2") use the
  same exact match; cards show an "N to buy" badge while a filter is active.
- **Tag chips are alphabetical with "All" pinned first** (sorted in `Recipes.tsx`;
  `tagCounts` still returns count-order for the editor's suggestions).
- **The recipe page edits itself — there is no separate Edit screen.** The "Edit"
  pill on `Detail.tsx` swaps the read view for `components/RecipeEditBody.tsx`:
  inline fields for title / time / serves / tags, per-row ingredient editing
  (qty + name, ↑/↓ reorder, add/remove, add/remove groups), and per-step
  directions (textarea, ↑/↓ reorder, add/remove). The working copy is
  `state.editDraft` (a full `Recipe`); the store's `mutateDraft` deep-clones it on
  every change and flags `editDirty`. **Done / Discard** in the hero (`saveEdit` /
  `discardEdit`); leaving with unsaved changes raises a `leaveEdit` confirm
  (guarded in `go` / `back` / `openDetail`). **Delete** and the **"+ New"** flow
  (`newRecipe` → a blank recipe straight into edit mode) live here too.
  `saveEdit` → `api.saveRecipe` (which now re-links ingredients to canonical
  `ingredient_id` by name, lookup-only) + `api.replaceStepTimers` (delete + insert
  the draft's timers in one shot).
- **One timer per step** (`recipe_step_timers`, unique on `recipe_id` +
  `step_index`). Read mode: `StepTimers` shows the tap-to-start countdown, or
  **nothing** when a step has no timer (no empty row). Edit mode: an "Add a timer"
  button / edit dialog, backed by `editDraft.timers`. `stepDuration(step)` still
  parses "for 20 minutes" / "1–1.5 hours" as a fallback for a timer-less step.
  `scripts/backfill-timers.mjs` seeded 236 `auto` rows from the imported cookbook.
- **Ingredient rows read quantity-first** — "½ tbsp Chili Vinegar", a fixed-width
  leading column in `Detail.tsx`.
- **The recipe ingredient control doesn't default.** Each row ends in a bevelled
  `.ing-status` nub (`data-status="unset|have|low"`, `•••` / `✓` / `!`) that opens
  an `.ing-menu` popover — "Have it" / "Running low" set the pantry status,
  "Add to list" drops it on the grocery list (`chooseIngredient` in the store —
  linked rows write `ingredient_id`, unlinked rows create the ingredient/row).
  One menu open at a time (`menuKey` in `Detail.tsx`), closed by outside
  pointerdown / Escape. CSS uses `color-mix()`.
- **Plan-to-cook sits at the top of the recipe page** (under the meta row).
- **The pantry-item editor is its own screen** (`screen: 'pantryItem'`,
  `screens/PantryItem.tsx`), not a modal — the form was too tall. `openPantryItem`
  / `closePantryItem` in the store; the tab bar keeps "Pantry" lit.
- **Every dialog has an X (top-right)** — `ConfirmDialog`, `AislesSheet`,
  `ManageTagsSheet`, the step-timer dialog.

## Shelby (the pantry assistant)

`screens/Shelby.tsx` is a **menu of three cards**, each a job that reads the
household's live pantry + cookbook. Two Deno Edge Functions (Claude Haiku 4.5,
forced tool calls) back them; the client has no fallback — an error just toasts.

| Card | Function / mode | Returns |
|---|---|---|
| **Update my pantry from a photo** | `shelby-vision` | `[{ name, category, matchedIngredientId }]` — matched against the canonical `ingredients` list. The client downscales the image (`lib/image.ts`) before upload. Confirm the checklist → matched items go `have`, new ones are created (`applyRestock`). |
| **Cook from my pantry** | `shelby` `mode:"cook_now"` | `{ headline, picks: [{ recipeId, why }], sequence? }` — cookbook recipes only, server-validated ids. Each pick shows a live `pantryMatch` badge. |
| **Recommend a new recipe** | `shelby` `mode:"invent"` | `{ headline, why, recipe: {title,minutes,serves,tags,sections,steps}, sequence? }` — a full recipe **not** in the cookbook. "Add to my recipes" (`saveInventedRecipe`) persists it and opens its detail. |

A `sequence` (`{ reason, recipeIds, shared }`) can ride along with either
`shelby` response — a short run of cookbook recipes to cook together, saveable
from the `SequenceCard` into `meal_sequences` (the Saved-sequences screen).

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # one time
npx supabase functions deploy shelby shelby-vision           # or the Supabase MCP
```

## Still to do

- `icon-192.png` / `icon-512.png` / `icon-180.png` — the manifest references them;
  `icon.svg` is there and works, the PNGs need exporting
- Illustrated ingredient art to replace the circle marks
- A proper "leave / switch household" path (today a device joins once)
- Rate-limiting / caching on the `shelby` function if usage grows

## Done

- Anonymous-auth session + real household membership gate
- Every read / write / tag-RPC wired through `src/api.ts` to Supabase
- Realtime: both partners' changes reconcile live
- Shelby is a pantry assistant (Claude Haiku 4.5): restock-from-photo
  (`shelby-vision`), cook-from-pantry and invent-a-recipe (`shelby` modes), each
  able to attach a saveable sequence
- **Junmac's cookbook imported** — 200 recipes (86 protein, 36 veg, 24 sauce, 21 carb,
  17 dessert, 12 cocktail, 4 soup) with authors, categories, `is_tried`/`is_favorite`
  markers, grouped ingredients and 18 cross-recipe links. Step text is stored bare
  (the app numbers steps). Ingredients are ordered by first use in the steps by an
  LLM pass (`sort-ingredients` Edge Function → Claude Haiku). See
  `scripts/cookbook-report.md` for the 14 recipes that needed a judgement call.
  Full re-run: `python scripts/import-cookbook.py && node scripts/apply-cookbook.mjs
  && node scripts/reorder-ingredients.mjs`.
- Pantry quick-filters, alphabetical tags, per-step timers, dropdown pantry statuses
- **Fridge → Pantry** — full refactor: table `pantry_items`, `PantryItem`, `state.pantry`,
  screen id `'pantry'`, both edge functions
- **Canonical `ingredients`** — `build-pantry.mjs` normalised 852 raw strings → 305
  canonical ingredients (cuts/brands kept separate); `recipe_ingredients.ingredient_id`
  linked on 1568 rows; all 312 ingredients seeded into the Pantry as `out`. 11 product
  photos + `preferred_brand` from the cookbook's brand list.
- **No Today tab** — Recipes is home; tabs are Recipes · Pantry · Plan · List
  (Plan = "Cooking soon").
- **Phase 1** — the app reads `ingredient_id`: exact pantry match, recipe-detail
  readiness header, per-ingredient status control. `data/seed.ts` gutted to the palette.
- **Phase 2 — Pantry CRUD** (`PantryItemSheet.tsx`): search + status filter chips
  (All / Have / Low / Out with counts); **Add** (name typeahead over the canonical
  list, aisle, status); **Edit** (rename — canonical, so it re-labels everywhere —
  and recategorise); **photo upload** per item → Storage → `ingredients.image_url`
  (rows show a thumbnail + `preferred_brand`); **delete** (drops the `pantry_items`
  row, keeps the ingredient). The editor is a **centred modal** (`.modal`), not a
  bottom sheet. New api: `addPantryItem`, `deletePantryItem`, `updateIngredient`,
  `uploadIngredientPhoto`, `listIngredients`. (Merge was removed.)
- **Phase 3 — cook queue, aisle CRUD, stored grocery list.**
  - `meal_plan` dropped; `RecipePickerSheet` + the weekday calendar gone.
  - **Plan tab → "Cooking soon"** (`cook_queue`): Plan-to-Cook on a recipe detail
    queues it and drops its missing ingredients on the grocery list; per-recipe
    have/need badge; "Add all to list" across the queue.
  - **Grocery list is stored** (`grocery_list` + `ingredient_id` / `from_recipe_id`):
    grouped by aisle, manual add, per-row delete, "Clear done"; ticking a linked
    row flips the ingredient to `have`.
  - **Aisles are editable** (`pantry_aisles`): the "Aisles" button on the Pantry
    header opens `AislesSheet` — reorder (↑/↓), rename, delete (items fall to the
    aisle above), add. `Category` is now just `string`.
