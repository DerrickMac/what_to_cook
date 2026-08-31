export type Meal = "breakfast" | "lunch" | "dinner" | "snack" | "dessert";

export type Recipe = {
  id: string;
  name: string;
  meal: Meal[];
  tags: string[];
  timeMinutes: number;
  ingredients: string[];
  steps: string[];
};

export const ALL_INGREDIENTS = [
  "eggs",
  "chicken",
  "rice",
  "pasta",
  "tomatoes",
  "cheese",
  "bread",
  "potatoes",
  "onion",
  "garlic",
  "beans",
  "spinach",
  "beef",
  "shrimp",
  "tortillas",
] as const;

export const recipes: Recipe[] = [
  {
    id: "veggie-omelette",
    name: "Veggie Omelette",
    meal: ["breakfast"],
    tags: ["quick", "vegetarian"],
    timeMinutes: 10,
    ingredients: ["eggs", "onion", "cheese", "spinach"],
    steps: [
      "Whisk 3 eggs with a pinch of salt and pepper.",
      "Sauté diced onion and spinach in a pan until soft.",
      "Pour eggs over the veggies, sprinkle cheese on top.",
      "Fold once the edges set, cook 1 more minute, and serve.",
    ],
  },
  {
    id: "garlic-butter-pasta",
    name: "Garlic Butter Pasta",
    meal: ["dinner", "lunch"],
    tags: ["quick", "vegetarian", "comfort"],
    timeMinutes: 20,
    ingredients: ["pasta", "garlic", "cheese"],
    steps: [
      "Boil pasta until al dente, reserving a cup of pasta water.",
      "Melt butter and sauté minced garlic until fragrant.",
      "Toss pasta with garlic butter, a splash of pasta water, and cheese.",
      "Season with salt, pepper, and fresh herbs if you have them.",
    ],
  },
  {
    id: "chicken-rice-bowl",
    name: "One-Pan Chicken Rice Bowl",
    meal: ["dinner", "lunch"],
    tags: ["protein", "meal-prep"],
    timeMinutes: 35,
    ingredients: ["chicken", "rice", "onion", "garlic"],
    steps: [
      "Season and sear chicken pieces until browned; set aside.",
      "Sauté onion and garlic, then add rice and toast briefly.",
      "Add broth or water, return chicken to the pan, cover and simmer.",
      "Cook until rice is tender and liquid is absorbed, then fluff and serve.",
    ],
  },
  {
    id: "bean-quesadillas",
    name: "Black Bean Quesadillas",
    meal: ["lunch", "dinner", "snack"],
    tags: ["vegetarian", "quick"],
    timeMinutes: 15,
    ingredients: ["tortillas", "beans", "cheese", "onion"],
    steps: [
      "Mash beans lightly with sautéed onion and a pinch of cumin.",
      "Spread bean mixture and cheese over a tortilla, top with another.",
      "Cook in a dry pan over medium heat until golden on both sides.",
      "Slice into wedges and serve with salsa or sour cream.",
    ],
  },
  {
    id: "shrimp-garlic-rice",
    name: "Garlic Shrimp with Rice",
    meal: ["dinner"],
    tags: ["seafood", "quick"],
    timeMinutes: 20,
    ingredients: ["shrimp", "rice", "garlic", "tomatoes"],
    steps: [
      "Cook rice according to package instructions.",
      "Sauté garlic in olive oil, add shrimp and cook until pink.",
      "Stir in chopped tomatoes and cook 2-3 minutes more.",
      "Serve the shrimp and tomatoes over rice.",
    ],
  },
  {
    id: "loaded-baked-potato",
    name: "Loaded Baked Potatoes",
    meal: ["dinner", "lunch"],
    tags: ["vegetarian", "comfort"],
    timeMinutes: 50,
    ingredients: ["potatoes", "cheese", "onion", "beans"],
    steps: [
      "Bake potatoes at 425°F (220°C) for 40-45 minutes until tender.",
      "Warm beans with sautéed onion and a pinch of chili powder.",
      "Split potatoes open and top with the bean mixture and cheese.",
      "Broil briefly until cheese melts, then serve.",
    ],
  },
  {
    id: "beef-tacos",
    name: "Weeknight Beef Tacos",
    meal: ["dinner"],
    tags: ["quick", "family"],
    timeMinutes: 25,
    ingredients: ["beef", "tortillas", "onion", "tomatoes", "cheese"],
    steps: [
      "Brown ground beef with diced onion and taco seasoning.",
      "Warm tortillas in a dry skillet or microwave.",
      "Fill tortillas with beef, diced tomatoes, and cheese.",
      "Add your favorite toppings and serve.",
    ],
  },
  {
    id: "caprese-toast",
    name: "Caprese Toast",
    meal: ["breakfast", "lunch", "snack"],
    tags: ["vegetarian", "quick", "no-cook-ish"],
    timeMinutes: 10,
    ingredients: ["bread", "tomatoes", "cheese", "garlic"],
    steps: [
      "Toast bread and rub with a cut garlic clove.",
      "Layer sliced tomatoes and cheese on top.",
      "Drizzle with olive oil, salt, and pepper.",
      "Add fresh basil if you have it, and serve.",
    ],
  },
  {
    id: "spinach-egg-scramble",
    name: "Spinach & Cheese Scramble",
    meal: ["breakfast"],
    tags: ["quick", "vegetarian", "high-protein"],
    timeMinutes: 8,
    ingredients: ["eggs", "spinach", "cheese"],
    steps: [
      "Whisk eggs with a splash of milk if available.",
      "Wilt spinach in a hot pan, then pour in the eggs.",
      "Scramble gently over medium-low heat until just set.",
      "Fold in cheese off the heat and serve immediately.",
    ],
  },
  {
    id: "tomato-bean-soup",
    name: "Garlicky Tomato Bean Soup",
    meal: ["lunch", "dinner"],
    tags: ["vegetarian", "comfort", "meal-prep"],
    timeMinutes: 30,
    ingredients: ["tomatoes", "beans", "garlic", "onion"],
    steps: [
      "Sauté onion and garlic until soft and fragrant.",
      "Add tomatoes and beans with a bit of broth or water.",
      "Simmer 15-20 minutes, mashing some beans for a thicker texture.",
      "Season with salt, pepper, and herbs, then serve with bread.",
    ],
  },
  {
    id: "chicken-quesadillas",
    name: "Chicken Quesadillas",
    meal: ["lunch", "dinner"],
    tags: ["quick", "family"],
    timeMinutes: 20,
    ingredients: ["chicken", "tortillas", "cheese", "onion"],
    steps: [
      "Cook diced chicken with onion and a pinch of chili powder.",
      "Layer chicken and cheese between two tortillas.",
      "Cook in a dry pan until golden and cheese melts.",
      "Cut into wedges and serve with salsa.",
    ],
  },
  {
    id: "chocolate-mug-cake",
    name: "5-Minute Chocolate Mug Cake",
    meal: ["dessert", "snack"],
    tags: ["quick", "sweet-tooth"],
    timeMinutes: 5,
    ingredients: ["eggs"],
    steps: [
      "Whisk an egg with cocoa powder, sugar, and a splash of milk in a mug.",
      "Stir in a tablespoon of flour until just combined.",
      "Microwave for 60-90 seconds until set but still moist.",
      "Let cool slightly and enjoy straight from the mug.",
    ],
  },
];

export function findMatches(selected: string[], meal: Meal | "any"): Recipe[] {
  return recipes.filter((r) => {
    const mealOk = meal === "any" || r.meal.includes(meal);
    if (!mealOk) return false;
    if (selected.length === 0) return true;
    return selected.some((ing) => r.ingredients.includes(ing));
  });
}

export function rankByMatchCount(selected: string[], list: Recipe[]): Recipe[] {
  return [...list].sort((a, b) => {
    const aMatches = a.ingredients.filter((i) => selected.includes(i)).length;
    const bMatches = b.ingredients.filter((i) => selected.includes(i)).length;
    return bMatches - aMatches;
  });
}
