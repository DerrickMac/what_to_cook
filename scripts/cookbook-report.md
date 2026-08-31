# Junmac cookbook import — report

**200 recipes** parsed across 7 categories.
- favourites (starred `*`): 30
- untested (`?` / incomplete): 17
- 1650 ingredient rows, 1322 direction steps
- 18 cross-recipe ingredient links resolved

## Recipes that were difficult to import  (14 of 200)

### Tier 1 — needs a human pass (imported, but broken or partial in the source)

- **Cleaning Razor Clams and Frying** — no ingredients parsed from the source
- **Sinigang incomplete** — 10/10 ingredients have no amount in the source — imported without quantities; 9/9 ingredients have no amount in the source — imported without quantities; appears 2× in the source — PROTEIN › Oxtail (by Otakoyakisoba); PROTEIN › Spare Ribs (by Otakoyakisoba). Both imported.; title says 'incomplete' — partial recipe in the source
- **Springrolls** — 11/11 ingredients have no amount in the source — imported without quantities; directions are a placeholder ('***')

### Tier 2 — duplicate titles (both copies imported; decide which to keep)

- **Japanese Curry** — appears 2× in the source — PROTEIN › Chicken Breasts/Thighs (by Kenji Lopez); PROTEIN › Chicken Breasts/Thighs (by Just One Cookbook). Both imported.
- **Pickled Cucumbers** — appears 2× in the source — VEGETABLES › Cucumbers (by Gaming Foodie); VEGETABLES › Cucumbers (by Derrick). Both imported.
- **Scallion Pancakes** — appears 2× in the source — CARBOHYDRATES › Pancakes/Fritters; CARBOHYDRATES › Pancakes/Fritters. Both imported.
- **Stir Fry Sauce** — appears 2× in the source — SAUCES & DIPS › Cooking Sauces (by RecipeTinEats); SAUCES & DIPS › Other. Both imported.

### Tier 3 — imported fine, just imprecise (missing amounts, or an unmatched cross-link)

- **Broiled Razor Clams** — 4/4 ingredients have no amount in the source — imported without quantities
- **Chicken Cutlet** — 3/4 ingredients have no amount in the source — imported without quantities
- **Daikon Steak** — 3/4 ingredients have no amount in the source — imported without quantities
- **Masala Fried Rice** — 10/11 ingredients have no amount in the source — imported without quantities
- **Panko Fried Shrimp** — 4/4 ingredients have no amount in the source — imported without quantities
- **Steak** — 4/4 ingredients have no amount in the source — imported without quantities
- **Transporting Clams** — 3/3 ingredients have no amount in the source — imported without quantities

## Notes on the mapping
- The source has **no cook times** — `minutes` is a per-category estimate (Protein 40, Veg 25, Carb 30, Sauce 10, Soup 50, Dessert 45, Cocktail 5).
- The source has **no serving counts** — `servings` keeps the raw "Yield" text; `serves` is parsed when a plain number was present, else 2.
- `hue_a`/`hue_b` (circle-mark colours) assigned by category.
- Ingredient quantity/name split is heuristic; when it was ambiguous the whole line is the name.
- `*` → `is_favorite`, `?` / "incomplete" → `is_tried = false`.
- Author names are kept verbatim from the source, so near-duplicates exist ("Kenji Lopez" / "Kenji Lopez-Alt", "Maangchi" / "Maanchi"). Not normalised.
- Cross-recipe links only resolve when the ingredient is a Google-Doc link to another recipe heading; "serve with X" mentions in prose stay as text.

## Side effects of the import
- The 10 fixture recipes were **deleted** — the meal plan and the two seed sequences referenced them, so those were cleared too. Re-plan from the new cookbook.
