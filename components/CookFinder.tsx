"use client";

import { useMemo, useState } from "react";
import {
  ALL_INGREDIENTS,
  Meal,
  Recipe,
  findMatches,
  rankByMatchCount,
} from "@/data/recipes";

const MEAL_OPTIONS: { value: Meal | "any"; label: string }[] = [
  { value: "any", label: "Any meal" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
];

export default function CookFinder() {
  const [selected, setSelected] = useState<string[]>([]);
  const [meal, setMeal] = useState<Meal | "any">("any");
  const [pick, setPick] = useState<Recipe | null>(null);

  const matches = useMemo(
    () => rankByMatchCount(selected, findMatches(selected, meal)),
    [selected, meal]
  );

  function toggleIngredient(ing: string) {
    setSelected((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  }

  function surpriseMe() {
    if (matches.length === 0) {
      setPick(null);
      return;
    }
    const top = matches.slice(0, Math.max(3, Math.ceil(matches.length / 2)));
    const random = top[Math.floor(Math.random() * top.length)];
    setPick(random);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          What To Cook 🍳
        </h1>
        <p className="mt-3 text-char/70">
          Pick what you&apos;ve got, and we&apos;ll tell you what to make.
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-char/60">
          Meal
        </h2>
        <div className="flex flex-wrap gap-2">
          {MEAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMeal(opt.value)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                meal === opt.value
                  ? "border-ember bg-ember text-white"
                  : "border-char/20 bg-white text-char hover:border-ember/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-char/60">
          Ingredients you have
        </h2>
        <div className="flex flex-wrap gap-2">
          {ALL_INGREDIENTS.map((ing) => (
            <button
              key={ing}
              onClick={() => toggleIngredient(ing)}
              className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${
                selected.includes(ing)
                  ? "border-ember bg-ember text-white"
                  : "border-char/20 bg-white text-char hover:border-ember/50"
              }`}
            >
              {ing}
            </button>
          ))}
        </div>
      </section>

      <div className="mb-10 flex items-center justify-between gap-4">
        <p className="text-sm text-char/60">
          {matches.length} recipe{matches.length === 1 ? "" : "s"} match
          {selected.length === 0 ? " (showing all)" : " your ingredients"}
        </p>
        <button
          onClick={surpriseMe}
          disabled={matches.length === 0}
          className="rounded-full bg-char px-6 py-2.5 font-semibold text-cream transition hover:bg-char/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          What should I cook?
        </button>
      </div>

      {pick && <RecipeCard recipe={pick} selected={selected} />}

      {!pick && matches.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {matches.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setPick(r)}
                className="w-full rounded-xl border border-char/10 bg-white p-4 text-left shadow-sm transition hover:border-ember/40 hover:shadow"
              >
                <p className="font-semibold">{r.name}</p>
                <p className="mt-1 text-xs text-char/60">
                  {r.timeMinutes} min · {r.meal.join(", ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {matches.length === 0 && (
        <p className="rounded-xl border border-dashed border-char/20 bg-white/60 p-6 text-center text-char/60">
          No matches yet — try picking a few more ingredients or a different
          meal.
        </p>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  selected,
}: {
  recipe: Recipe;
  selected: string[];
}) {
  return (
    <div className="rounded-2xl border border-char/10 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">{recipe.name}</h3>
          <p className="mt-1 text-sm text-char/60">
            {recipe.timeMinutes} min · {recipe.meal.join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {recipe.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-cream px-2.5 py-1 text-xs text-char/60"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 font-semibold">Ingredients</h4>
          <ul className="space-y-1 text-sm">
            {recipe.ingredients.map((ing) => (
              <li
                key={ing}
                className={`capitalize ${
                  selected.includes(ing) ? "text-ember font-medium" : "text-char/80"
                }`}
              >
                {selected.includes(ing) ? "✓ " : "• "}
                {ing}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-semibold">Steps</h4>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-char/80">
            {recipe.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
