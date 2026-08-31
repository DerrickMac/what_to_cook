import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as api from './api';
import {
  aisle,
  blankRecipe,
  byId,
  nextStatus,
  pantryHaves,
  pantryMatch,
  tidyRecipe,
} from './lib/derive';
import { FALLBACK_AISLE } from './types';
import { TERRACOTTA, SAFFRON } from './data/seed';
import { fileToBase64 } from './lib/image';
import type {
  Aisle,
  ConfirmState,
  CookNowResult,
  GroceryRow,
  Ingredient,
  InventResult,
  InventedRecipe,
  PantryItem,
  Household,
  Recipe,
  RecipeSection,
  RestockItem,
  Screen,
  Sequence,
  ShelbySequence,
  ShelbyView,
  Status,
  StepTimerDef,
} from './types';

export interface AppState {
  screen: Screen;
  prev: Screen;

  household: Household | null;
  householdName: string;
  inviteCode: string;

  recipes: Recipe[];
  pantry: PantryItem[];
  aisles: Aisle[];
  cookQueue: string[];
  grocery: GroceryRow[];
  sequences: Sequence[];

  query: string;
  activeTag: string | null;
  pantryFilter: 'off' | 'ready' | 'almost';
  pantryQuery: string;
  pantryStatusFilter: Status | 'all';
  pantryEditId: string | 'new' | null;
  aislesOpen: boolean;
  detailId: string | null;

  /** Non-null ⟺ the recipe page is in edit mode (holds the working copy). */
  editDraft: Recipe | null;
  editDirty: boolean;
  editNew: boolean;
  editTagInput: string;

  tagsOpen: boolean;
  renamingTag: string | null;
  tagRenameDraft: string;
  deleteTagPending: string | null;

  confirm: ConfirmState | null;
  toast: string;

  /* Shelby */
  shelbyView: ShelbyView;
  shelbyCraving: string;
  shelbyBusy: boolean;
  cookNow: CookNowResult | null;
  invent: InventResult | null;
  restock: RestockItem[] | null;
  restockBusy: boolean;
}

const initialState: AppState = {
  screen: 'onboarding',
  prev: 'recipes',
  household: null,
  householdName: '',
  inviteCode: '',
  recipes: [],
  pantry: [],
  aisles: [],
  cookQueue: [],
  grocery: [],
  sequences: [],
  query: '',
  activeTag: null,
  pantryFilter: 'off',
  pantryQuery: '',
  pantryStatusFilter: 'all',
  pantryEditId: null,
  aislesOpen: false,
  detailId: null,
  editDraft: null,
  editDirty: false,
  editNew: false,
  editTagInput: '',
  tagsOpen: false,
  renamingTag: null,
  tagRenameDraft: '',
  deleteTagPending: null,
  confirm: null,
  toast: '',
  shelbyView: 'menu',
  shelbyCraving: '',
  shelbyBusy: false,
  cookNow: null,
  invent: null,
  restock: null,
  restockBusy: false,
};

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function useAppStore() {
  const [state, set] = useState<AppState>(initialState);
  const toastTimer = useRef<number | undefined>(undefined);

  const setState = useCallback((patch: Patch) => {
    set((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  /* -------- Load + realtime -------- */

  const load = useCallback(async () => {
    const [recipes, pantry, aisles, cookQueue, grocery, sequences] = await Promise.all([
      api.fetchRecipes(),
      api.fetchPantryItems(),
      api.fetchAisles(),
      api.fetchCookQueue(),
      api.fetchGrocery(),
      api.fetchSequences(),
    ]);
    setState({ recipes, pantry, aisles, cookQueue, grocery, sequences });
  }, [setState]);

  const unsubRef = useRef<() => void>(() => {});
  const startRealtime = useCallback(() => {
    unsubRef.current();
    unsubRef.current = api.subscribeToHousehold(() => void load());
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const household = await api.init();
        if (cancelled) return;
        if (household) {
          setState((s) => (s.screen === 'onboarding' ? { household, screen: 'recipes' } : { household }));
          await load();
          if (!cancelled) startRealtime();
        }
      } catch (err) {
        if (!cancelled) setState({ toast: String((err as Error).message ?? err) });
      }
    })();
    return () => {
      cancelled = true;
      unsubRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- Chrome -------- */

  const flash = useCallback(
    (text: string) => {
      setState({ toast: text });
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setState({ toast: '' }), 2200);
    },
    [setState]
  );

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  /** If there are unsaved recipe edits, ask before leaving. */
  const leaveGuard = useCallback(
    (to: Screen): boolean => {
      if (!state.editDraft || !state.editDirty) return true;
      setState({
        confirm: {
          kind: 'leaveEdit',
          id: '',
          title: 'Discard your changes?',
          body: "This recipe has edits that haven't been saved.",
          action: 'Discard',
          leaveTo: to,
        },
      });
      return false;
    },
    [state.editDraft, state.editDirty, setState]
  );

  const go = useCallback(
    (screen: Screen) => {
      if (!leaveGuard(screen)) return;
      setState((s) => ({
        prev: s.screen,
        screen,
        editDraft: null,
        editDirty: false,
        editNew: false,
        ...(screen === 'shelby' ? { shelbyView: 'menu' as ShelbyView } : {}),
      }));
    },
    [leaveGuard, setState]
  );

  const openDetail = useCallback(
    (id: string) => {
      if (!leaveGuard('detail')) return;
      setState((s) => ({
        prev: s.screen === 'detail' ? s.prev : s.screen,
        screen: 'detail',
        detailId: id,
        editDraft: null,
        editDirty: false,
        editNew: false,
      }));
    },
    [leaveGuard, setState]
  );

  const back = useCallback(() => {
    const to = state.prev;
    if (!leaveGuard(to)) return;
    setState({ screen: to, editDraft: null, editDirty: false, editNew: false });
  }, [state.prev, leaveGuard, setState]);

  /** Open the pantry-item editor as its own screen. `'new'` = add. */
  const openPantryItem = useCallback(
    (id: string | 'new') =>
      setState((s) => ({
        prev: s.screen === 'pantryItem' ? s.prev : s.screen,
        screen: 'pantryItem',
        pantryEditId: id,
      })),
    [setState]
  );

  const closePantryItem = useCallback(
    () => setState((s) => ({ screen: s.prev === 'pantryItem' ? 'pantry' : s.prev, pantryEditId: null })),
    [setState]
  );

  /* -------- Household -------- */

  const createHousehold = useCallback(async () => {
    try {
      const h = await api.createHousehold(state.householdName || 'Our Kitchen');
      await load();
      setState({ household: h, screen: 'recipes' });
      startRealtime();
    } catch (err) {
      flash(String((err as Error).message ?? err));
    }
  }, [state.householdName, setState, load, startRealtime, flash]);

  const joinHousehold = useCallback(async () => {
    try {
      const h = await api.joinHousehold(state.inviteCode || 'ADOBO7');
      await load();
      setState({ household: h, screen: 'recipes' });
      startRealtime();
    } catch (err) {
      flash(String((err as Error).message ?? err));
    }
  }, [state.inviteCode, setState, load, startRealtime, flash]);

  /* -------- Pantry (optimistic) -------- */

  const cycleItem = useCallback(
    (item: PantryItem) => {
      const next = nextStatus(item.status);
      setState((s) => ({
        pantry: s.pantry.map((f) => (f.id === item.id ? { ...f, status: next } : f)),
      }));
      void api.setItemStatus(item.id, next);
    },
    [setState]
  );

  const setPantryStatus = useCallback(
    (item: PantryItem, status: Status) => {
      if (status === item.status) return;
      setState((s) => ({
        pantry: s.pantry.map((f) => (f.id === item.id ? { ...f, status } : f)),
      }));
      void api.setItemStatus(item.id, status);
    },
    [setState]
  );

  /** Set a canonical ingredient's status — used from recipe ingredient rows. */
  const setIngredientStatus = useCallback(
    (ingredientId: string, status: Status) => {
      setState((s) => ({
        pantry: s.pantry.map((p) =>
          p.ingredientId === ingredientId ? { ...p, status } : p
        ),
      }));
      void api.setIngredientStatus(ingredientId, status);
    },
    [setState]
  );

  /* -------- Pantry CRUD -------- */

  const addPantry = useCallback(
    async (name: string, category: PantryItem['cat'], status: Status) => {
      try {
        const item = await api.addPantryItem(name, category, status);
        setState((s) => ({
          pantry: s.pantry.some((p) => p.ingredientId === item.ingredientId)
            ? s.pantry.map((p) => (p.ingredientId === item.ingredientId ? item : p))
            : [...s.pantry, item],
        }));
      } catch (err) {
        flash(String((err as Error).message ?? err));
      }
    },
    [setState, flash]
  );

  const deletePantry = useCallback(
    (item: PantryItem) => {
      setState((s) => ({ pantry: s.pantry.filter((p) => p.id !== item.id) }));
      void api.deletePantryItem(item.id).catch((e) => flash(String(e.message ?? e)));
    },
    [setState, flash]
  );

  const editIngredient = useCallback(
    (item: PantryItem, patch: { name?: string; category?: PantryItem['cat'] }) => {
      setState((s) => ({
        pantry: s.pantry.map((p) =>
          p.ingredientId === item.ingredientId
            ? { ...p, name: patch.name?.trim() || p.name, cat: patch.category ?? p.cat }
            : p
        ),
      }));
      void api.updateIngredient(item.ingredientId, patch).catch((e) => flash(String(e.message ?? e)));
    },
    [setState, flash]
  );

  const uploadPantryPhoto = useCallback(
    async (item: PantryItem, file: File) => {
      try {
        const url = await api.uploadIngredientPhoto(item.ingredientId, file);
        setState((s) => ({
          pantry: s.pantry.map((p) =>
            p.ingredientId === item.ingredientId ? { ...p, imageUrl: url } : p
          ),
        }));
      } catch (err) {
        flash(String((err as Error).message ?? err));
      }
    },
    [setState, flash]
  );

  /* -------- Aisles -------- */

  const addAisle = useCallback(
    async (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      try {
        const a = await api.addAisle(clean);
        setState((s) => ({ aisles: [...s.aisles, a] }));
      } catch (err) {
        flash(String((err as Error).message ?? err));
      }
    },
    [setState, flash]
  );

  const renameAisle = useCallback(
    (id: string, to: string) => {
      const from = state.aisles.find((a) => a.id === id)?.name;
      const clean = to.trim();
      if (!from || !clean || clean === from) return;
      setState((s) => ({
        aisles: s.aisles.map((a) => (a.id === id ? { ...a, name: clean } : a)),
        pantry: s.pantry.map((p) => (p.cat === from ? { ...p, cat: clean } : p)),
        grocery: s.grocery.map((g) => (g.cat === from ? { ...g, cat: clean } : g)),
      }));
      void api.renameAisle(id, from, clean).catch((e) => flash(String(e.message ?? e)));
    },
    [state.aisles, setState, flash]
  );

  const deleteAisle = useCallback(
    (id: string) => {
      const target = state.aisles.find((a) => a.id === id);
      if (!target) return;
      const fallback =
        state.aisles.find((a) => a.id !== id)?.name ?? FALLBACK_AISLE;
      setState((s) => ({
        aisles: s.aisles.filter((a) => a.id !== id),
        pantry: s.pantry.map((p) => (p.cat === target.name ? { ...p, cat: fallback } : p)),
        grocery: s.grocery.map((g) => (g.cat === target.name ? { ...g, cat: fallback } : g)),
      }));
      void api.deleteAisle(id, target.name, fallback).catch((e) => flash(String(e.message ?? e)));
    },
    [state.aisles, setState, flash]
  );

  const moveAisle = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = state.aisles.findIndex((a) => a.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= state.aisles.length) return;
      const next = state.aisles.slice();
      [next[idx], next[to]] = [next[to], next[idx]];
      setState({ aisles: next.map((a, i) => ({ ...a, position: i })) });
      void api.reorderAisles(next.map((a) => a.id)).catch((e) => flash(String(e.message ?? e)));
    },
    [state.aisles, setState, flash]
  );

  /* -------- Cook queue + grocery -------- */

  const planToCook = useCallback(
    async (recipe: Recipe) => {
      const haves = pantryHaves(state.pantry);
      const { missing, need } = pantryMatch(recipe, haves);
      setState((s) => ({
        cookQueue: s.cookQueue.includes(recipe.id) ? s.cookQueue : [recipe.id, ...s.cookQueue],
      }));
      try {
        await api.addToCookQueue(recipe.id);
        const added = await api.addGroceryItems(
          missing.map((it) => ({
            name: it.n,
            qty: it.q || null,
            ingredientId: it.ingredientId ?? null,
            fromRecipeId: recipe.id,
          }))
        );
        if (added.length) setState((s) => ({ grocery: [...s.grocery, ...added] }));
        flash(
          need === 0
            ? `${recipe.title} — you have everything`
            : `${recipe.title} — ${added.length || need} added to your list`
        );
      } catch (err) {
        flash(String((err as Error).message ?? err));
      }
    },
    [state.pantry, setState, flash]
  );

  const unplan = useCallback(
    (recipeId: string) => {
      setState((s) => ({ cookQueue: s.cookQueue.filter((id) => id !== recipeId) }));
      void api.removeFromCookQueue(recipeId).catch((e) => flash(String(e.message ?? e)));
    },
    [setState, flash]
  );

  const queueMissingToGrocery = useCallback(async () => {
    const haves = pantryHaves(state.pantry);
    const queued = state.cookQueue
      .map((id) => byId(state.recipes, id))
      .filter((r): r is Recipe => !!r);
    const items: api.GroceryInput[] = [];
    const seen = new Set<string>();
    for (const r of queued) {
      for (const it of pantryMatch(r, haves).missing) {
        const k = it.ingredientId ?? it.n.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        items.push({
          name: it.n,
          qty: it.q || null,
          ingredientId: it.ingredientId ?? null,
          fromRecipeId: r.id,
        });
      }
    }
    try {
      const added = await api.addGroceryItems(items);
      if (added.length) setState((s) => ({ grocery: [...s.grocery, ...added] }));
      flash(added.length ? `${added.length} added to your list` : 'Everything is already on your list');
    } catch (err) {
      flash(String((err as Error).message ?? err));
    }
  }, [state.pantry, state.cookQueue, state.recipes, setState, flash]);

  const toggleGroceryRow = useCallback(
    (row: GroceryRow) => {
      const next = !row.checked;
      setState((s) => ({
        grocery: s.grocery.map((g) => (g.id === row.id ? { ...g, checked: next } : g)),
        // Ticking something off means we now have it.
        pantry:
          next && row.ingredientId
            ? s.pantry.map((p) =>
                p.ingredientId === row.ingredientId ? { ...p, status: 'have' as Status } : p
              )
            : s.pantry,
      }));
      void api.setGroceryChecked(row.id, next).catch((e) => flash(String(e.message ?? e)));
      if (next && row.ingredientId) {
        void api.setIngredientStatus(row.ingredientId, 'have').catch(() => {});
      }
    },
    [setState, flash]
  );

  const addGroceryManual = useCallback(
    async (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      try {
        const added = await api.addGroceryItems([{ name: clean }]);
        if (added.length) setState((s) => ({ grocery: [...s.grocery, ...added] }));
      } catch (err) {
        flash(String((err as Error).message ?? err));
      }
    },
    [setState, flash]
  );

  const deleteGroceryRow = useCallback(
    (row: GroceryRow) => {
      setState((s) => ({ grocery: s.grocery.filter((g) => g.id !== row.id) }));
      void api.deleteGroceryItem(row.id).catch((e) => flash(String(e.message ?? e)));
    },
    [setState, flash]
  );

  const clearCheckedGrocery = useCallback(() => {
    setState((s) => ({ grocery: s.grocery.filter((g) => !g.checked) }));
    void api.clearCheckedGrocery().catch((e) => flash(String(e.message ?? e)));
  }, [setState, flash]);

  /**
   * A recipe ingredient row's menu: "have" / "low" set the pantry status,
   * "buy" drops it on the grocery list (and marks the pantry out).
   */
  const chooseIngredient = useCallback(
    async (recipe: Recipe, item: Ingredient, choice: 'have' | 'low' | 'buy') => {
      if (choice === 'buy') {
        if (item.ingredientId) setIngredientStatus(item.ingredientId, 'out');
        try {
          const added = await api.addGroceryItems([
            {
              name: item.n,
              qty: item.q || null,
              ingredientId: item.ingredientId ?? null,
              fromRecipeId: recipe.id,
            },
          ]);
          if (added.length) setState((s) => ({ grocery: [...s.grocery, ...added] }));
          flash(added.length ? `${item.n} → grocery list` : `${item.n} is already on your list`);
        } catch (err) {
          flash(String((err as Error).message ?? err));
        }
        return;
      }
      if (item.ingredientId) setIngredientStatus(item.ingredientId, choice);
      else await addPantry(item.n, aisle(item.n, state.pantry), choice);
    },
    [state.pantry, setIngredientStatus, addPantry, setState, flash]
  );

  /* -------- Recipes -------- */

  const toggleFav = useCallback(() => {
    const id = state.detailId;
    if (!id) return;
    const current = byId(state.recipes, id);
    void api.setFavorite(id, !current?.fav);
    setState((s) => ({
      recipes: s.recipes.map((r) => (r.id === id ? { ...r, fav: !r.fav } : r)),
    }));
  }, [state.detailId, state.recipes, setState]);

  /* -------- Inline recipe editing -------- */

  const newRecipe = useCallback(() => {
    if (!leaveGuard('detail')) return;
    const r = blankRecipe();
    setState({
      prev: 'recipes',
      screen: 'detail',
      detailId: r.id,
      editDraft: r,
      editDirty: false,
      editNew: true,
      editTagInput: '',
    });
  }, [leaveGuard, setState]);

  const startEdit = useCallback(() => {
    const r = byId(state.recipes, state.detailId);
    if (!r) return;
    setState({
      editDraft: JSON.parse(JSON.stringify(r)) as Recipe,
      editDirty: false,
      editNew: false,
      editTagInput: '',
    });
  }, [state.recipes, state.detailId, setState]);

  const discardEdit = useCallback(() => {
    setState((s) => ({
      editDraft: null,
      editDirty: false,
      editNew: false,
      ...(s.editNew ? { screen: 'recipes' as Screen } : {}),
    }));
  }, [setState]);

  const saveEdit = useCallback(async () => {
    const d = state.editDraft;
    if (!d) return;
    const clean = tidyRecipe(d);
    try {
      const saved = await api.saveRecipe(clean);
      await api.replaceStepTimers(saved.id, clean.timers.map((t) => ({
        stepIndex: t.stepIndex,
        label: t.label,
        minutes: t.minutes,
      })));
      setState((s) => ({
        recipes: s.recipes.some((r) => r.id === saved.id)
          ? s.recipes.map((r) => (r.id === saved.id ? { ...saved, timers: clean.timers } : r))
          : [...s.recipes, { ...saved, timers: clean.timers }],
        detailId: saved.id,
        editDraft: null,
        editDirty: false,
        editNew: false,
      }));
      flash('Saved');
    } catch (err) {
      flash(String((err as Error).message ?? err));
    }
  }, [state.editDraft, setState, flash]);

  /** Every field mutator runs the draft through `fn` and marks it dirty. */
  const mutateDraft = useCallback(
    (fn: (d: Recipe) => void) => {
      setState((s) => {
        if (!s.editDraft) return {};
        const d = JSON.parse(JSON.stringify(s.editDraft)) as Recipe;
        fn(d);
        return { editDraft: d, editDirty: true };
      });
    },
    [setState]
  );

  const editField = useCallback(
    (patch: Partial<Pick<Recipe, 'title' | 'minutes' | 'serves' | 'tags'>>) =>
      mutateDraft((d) => Object.assign(d, patch)),
    [mutateDraft]
  );

  const addEditTag = useCallback(
    (name: string) => {
      const t = name.trim().toLowerCase();
      if (!t) return;
      mutateDraft((d) => {
        if (!d.tags.includes(t)) d.tags.push(t);
      });
      setState({ editTagInput: '' });
    },
    [mutateDraft, setState]
  );

  const removeEditTag = useCallback(
    (t: string) => mutateDraft((d) => (d.tags = d.tags.filter((x) => x !== t))),
    [mutateDraft]
  );

  const emptyItem = (): Ingredient => ({ n: '', q: '' });
  const swap = <T,>(a: T[], i: number, j: number) => {
    [a[i], a[j]] = [a[j], a[i]];
  };

  const addIngredient = useCallback(
    (si: number) => mutateDraft((d) => d.sections[si]?.items.push(emptyItem())),
    [mutateDraft]
  );
  const setIngredient = useCallback(
    (si: number, ii: number, patch: Partial<Ingredient>) =>
      mutateDraft((d) => {
        const it = d.sections[si]?.items[ii];
        if (!it) return;
        Object.assign(it, patch);
        if (patch.n !== undefined) delete it.ingredientId; // name changed — relink on save
      }),
    [mutateDraft]
  );
  const removeIngredient = useCallback(
    (si: number, ii: number) => mutateDraft((d) => d.sections[si]?.items.splice(ii, 1)),
    [mutateDraft]
  );
  const moveIngredient = useCallback(
    (si: number, ii: number, dir: -1 | 1) =>
      mutateDraft((d) => {
        const items = d.sections[si]?.items;
        const j = ii + dir;
        if (items && j >= 0 && j < items.length) swap(items, ii, j);
      }),
    [mutateDraft]
  );

  const addSection = useCallback(
    () => mutateDraft((d) => d.sections.push({ name: 'New group', items: [emptyItem()] } as RecipeSection)),
    [mutateDraft]
  );
  const setSectionName = useCallback(
    (si: number, name: string) => mutateDraft((d) => { if (d.sections[si]) d.sections[si].name = name; }),
    [mutateDraft]
  );
  const removeSection = useCallback(
    (si: number) => mutateDraft((d) => { if (d.sections.length > 1) d.sections.splice(si, 1); }),
    [mutateDraft]
  );

  const remapTimers = (timers: StepTimerDef[], from: number, to: number | null): StepTimerDef[] => {
    if (to === null) {
      return timers
        .filter((t) => t.stepIndex !== from)
        .map((t) => (t.stepIndex > from ? { ...t, stepIndex: t.stepIndex - 1 } : t));
    }
    return timers.map((t) =>
      t.stepIndex === from ? { ...t, stepIndex: to } : t.stepIndex === to ? { ...t, stepIndex: from } : t
    );
  };

  const addStep = useCallback(() => mutateDraft((d) => d.steps.push('')), [mutateDraft]);
  const setStep = useCallback(
    (i: number, text: string) => mutateDraft((d) => { d.steps[i] = text; }),
    [mutateDraft]
  );
  const removeStep = useCallback(
    (i: number) =>
      mutateDraft((d) => {
        d.steps.splice(i, 1);
        d.timers = remapTimers(d.timers, i, null);
      }),
    [mutateDraft]
  );
  const moveStep = useCallback(
    (i: number, dir: -1 | 1) =>
      mutateDraft((d) => {
        const j = i + dir;
        if (j < 0 || j >= d.steps.length) return;
        swap(d.steps, i, j);
        d.timers = remapTimers(d.timers, i, j);
      }),
    [mutateDraft]
  );

  const setDraftTimer = useCallback(
    (stepIndex: number, label: string, minutes: number) => {
      if (!(minutes > 0)) return;
      mutateDraft((d) => {
        const existing = d.timers.find((t) => t.stepIndex === stepIndex);
        d.timers = [
          ...d.timers.filter((t) => t.stepIndex !== stepIndex),
          { id: existing?.id ?? `tmp-${stepIndex}-${Date.now()}`, stepIndex, label, minutes, source: 'user' },
        ];
      });
    },
    [mutateDraft]
  );
  const removeDraftTimer = useCallback(
    (stepIndex: number) =>
      mutateDraft((d) => (d.timers = d.timers.filter((t) => t.stepIndex !== stepIndex))),
    [mutateDraft]
  );

  /* -------- Tags (bulk, server-side) -------- */

  const commitTagRename = useCallback(
    (from: string) => {
      const to = state.tagRenameDraft.trim() || from;
      void api.renameTag(from, to);
      setState((s) => ({
        recipes: s.recipes.map((r) => ({
          ...r,
          tags: r.tags.map((t) => (t === from ? to : t)),
        })),
        renamingTag: null,
        activeTag: s.activeTag === from ? to : s.activeTag,
      }));
    },
    [state.tagRenameDraft, setState]
  );

  const commitTagDelete = useCallback(
    (tag: string) => {
      void api.deleteTag(tag);
      setState((s) => ({
        recipes: s.recipes.map((r) => ({ ...r, tags: r.tags.filter((t) => t !== tag) })),
        deleteTagPending: null,
        activeTag: s.activeTag === tag ? null : s.activeTag,
      }));
      flash('Tag removed from every recipe');
    },
    [setState, flash]
  );

  /* -------- Shelby -------- */

  const shelbyGo = useCallback(
    (view: ShelbyView) => setState({ shelbyView: view }),
    [setState]
  );

  const askCookNow = useCallback(
    async (attempt = 0) => {
      setState({ shelbyBusy: true });
      try {
        const cookNow = await api.shelbyCookNow(state.shelbyCraving, attempt);
        setState({ cookNow, shelbyBusy: false });
      } catch (err) {
        setState({ shelbyBusy: false });
        flash(String((err as Error).message ?? err));
      }
    },
    [state.shelbyCraving, setState, flash]
  );

  const askInvent = useCallback(
    async (attempt = 0) => {
      setState({ shelbyBusy: true });
      try {
        const invent = await api.shelbyInvent(state.shelbyCraving, attempt);
        setState({ invent, shelbyBusy: false });
      } catch (err) {
        setState({ shelbyBusy: false });
        flash(String((err as Error).message ?? err));
      }
    },
    [state.shelbyCraving, setState, flash]
  );

  const identifyPhoto = useCallback(
    async (file: File) => {
      setState({ restockBusy: true, restock: null });
      try {
        const { data, mediaType } = await fileToBase64(file);
        const items = await api.shelbyIdentify(data, mediaType);
        setState({ restock: items, restockBusy: false });
        if (!items.length) flash("Couldn't make anything out — try another photo");
      } catch (err) {
        setState({ restockBusy: false });
        flash(String((err as Error).message ?? err));
      }
    },
    [setState, flash]
  );

  const toggleRestock = useCallback(
    (name: string) =>
      setState((s) => ({
        restock: (s.restock ?? []).map((r) => (r.name === name ? { ...r, keep: !r.keep } : r)),
      })),
    [setState]
  );

  const applyRestock = useCallback(async () => {
    const items = (state.restock ?? []).filter((r) => r.keep);
    if (!items.length) {
      setState({ restock: null, shelbyView: 'menu' });
      return;
    }
    setState({ restockBusy: true });
    for (const it of items) {
      if (it.matchedIngredientId) setIngredientStatus(it.matchedIngredientId, 'have');
      else await addPantry(it.name, it.category, 'have');
    }
    setState({ restockBusy: false, restock: null, shelbyView: 'menu' });
    flash(`${items.length} marked as in the pantry`);
  }, [state.restock, setIngredientStatus, addPantry, setState, flash]);

  const saveShelbySequence = useCallback(
    (seq: ShelbySequence, name: string) => {
      const rec: Sequence = {
        id: crypto.randomUUID(),
        name: name.trim() || 'Pantry run',
        ids: seq.recipeIds,
        extras: [],
        shared: seq.shared,
      };
      void api.saveSequence(rec).catch((e) => flash(String(e.message ?? e)));
      setState((s) => ({ sequences: s.sequences.concat(rec) }));
      flash('Sequence saved');
    },
    [setState, flash]
  );

  /** Persist one of Shelby's invented recipes into the cookbook. */
  const saveInventedRecipe = useCallback(
    (draft: InventedRecipe) => {
      const rec: Recipe = {
        id: crypto.randomUUID(),
        title: draft.title,
        tags: draft.tags,
        fav: false,
        ai: false,
        minutes: draft.minutes,
        serves: draft.serves,
        hueA: TERRACOTTA,
        hueB: SAFFRON,
        sections: draft.sections,
        steps: draft.steps,
        timers: [],
      };
      void api.saveRecipe(rec).catch((e) => flash(String(e.message ?? e)));
      setState((s) => ({
        recipes: s.recipes.concat(rec),
        screen: 'detail',
        prev: 'shelby',
        detailId: rec.id,
        invent: null,
      }));
      flash('Added to your recipes');
    },
    [setState, flash]
  );

  /* -------- Confirm dialog -------- */

  const askDeleteRecipe = useCallback(
    (r: Recipe) =>
      setState({
        confirm: {
          kind: 'recipe',
          id: r.id,
          title: `Delete “${r.title}”?`,
          body: 'It disappears for both of you, and drops off Cooking soon.',
          action: 'Delete recipe',
        },
      }),
    [setState]
  );

  const askDeleteSequence = useCallback(
    (s: Sequence) =>
      setState({
        confirm: {
          kind: 'sequence',
          id: s.id,
          title: `Delete “${s.name}”?`,
          body: 'The recipes stay in your cookbook — only the sequence goes.',
          action: 'Delete sequence',
        },
      }),
    [setState]
  );

  const runConfirm = useCallback(() => {
    const c = state.confirm;
    if (!c) return;
    if (c.kind === 'leaveEdit') {
      setState({
        confirm: null,
        editDraft: null,
        editDirty: false,
        editNew: false,
        screen: c.leaveTo ?? 'recipes',
      });
      return;
    }
    if (c.kind === 'recipe') {
      // A brand-new recipe was never persisted — just drop it.
      if (!state.editNew) void api.deleteRecipe(c.id);
      setState((s) => ({
        recipes: s.recipes.filter((r) => r.id !== c.id),
        cookQueue: s.cookQueue.filter((id) => id !== c.id),
        confirm: null,
        editDraft: null,
        editDirty: false,
        editNew: false,
        screen: 'recipes',
      }));
      flash('Recipe deleted');
    } else {
      void api.deleteSequence(c.id);
      setState((s) => ({ sequences: s.sequences.filter((x) => x.id !== c.id), confirm: null }));
      flash('Sequence deleted');
    }
  }, [state.confirm, state.editNew, setState, flash]);

  return {
    state,
    setState,
    flash,
    go,
    back,
    openDetail,
    openPantryItem,
    closePantryItem,
    createHousehold,
    joinHousehold,
    cycleItem,
    setPantryStatus,
    setIngredientStatus,
    addPantry,
    deletePantry,
    editIngredient,
    uploadPantryPhoto,
    addAisle,
    renameAisle,
    deleteAisle,
    moveAisle,
    planToCook,
    unplan,
    queueMissingToGrocery,
    toggleGroceryRow,
    addGroceryManual,
    deleteGroceryRow,
    clearCheckedGrocery,
    chooseIngredient,
    toggleFav,
    newRecipe,
    startEdit,
    discardEdit,
    saveEdit,
    editField,
    addEditTag,
    removeEditTag,
    addIngredient,
    setIngredient,
    removeIngredient,
    moveIngredient,
    addSection,
    setSectionName,
    removeSection,
    addStep,
    setStep,
    removeStep,
    moveStep,
    setDraftTimer,
    removeDraftTimer,
    commitTagRename,
    commitTagDelete,
    shelbyGo,
    askCookNow,
    askInvent,
    identifyPhoto,
    toggleRestock,
    applyRestock,
    saveShelbySequence,
    saveInventedRecipe,
    askDeleteRecipe,
    askDeleteSequence,
    runConfirm,
  };
}

export type Store = ReturnType<typeof useAppStore>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
