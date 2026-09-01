import { useState } from 'react';
import { useStore } from '../store';
import { CardWell } from '../components/CircleMark';
import {
  filterRecipes,
  tagCounts,
  buildTagTree,
  descendantsOf,
  pantryMatch,
  pantryHaves,
} from '../lib/derive';

const PANTRY_CHIPS = [
  { key: 'off', label: 'All recipes' },
  { key: 'ready', label: 'Can make now' },
  { key: 'almost', label: 'Missing ≤ 2' },
] as const;

export function Recipes() {
  const { state, setState, openDetail, newRecipe } = useStore();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Tag rail, three tiers deep: category (Protein, Vegetables, …) →
  // group (beef, chicken, …) → specific cut (beef ribs, …). Anything
  // not filed in TAG_TAXONOMY stays a normal flat chip.
  const allTagCounts = tagCounts(state.recipes);
  const { categories, top } = buildTagTree(allTagCounts);
  const tags = [...top].sort((a, b) => a.tag.localeCompare(b.tag));

  const activeCategory = categories.find((c) => c.label === expandedCategory);
  const activeGroup = activeCategory?.groups.find((g) => g.tag === expandedGroup);

  const activeChildren = state.activeTag ? descendantsOf(state.activeTag, categories) : [];
  const { list, note } = filterRecipes(state.recipes, state.query, state.activeTag, activeChildren);

  // pantry match, computed once for the visible list
  const haves = pantryHaves(state.pantry);
  const matches = new Map(list.map((r) => [r.id, pantryMatch(r, haves)]));
  const shown =
    state.pantryFilter === 'off'
      ? list
      : list.filter((r) => {
          const need = matches.get(r.id)!.need;
          return state.pantryFilter === 'ready' ? need === 0 : need <= 2;
        });

  return (
    <div className="screen rise">
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h1 className="screen-title">Cookbook</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pill" onClick={() => setState({ tagsOpen: true })}>
            Tags
          </button>
          <button className="pill pill-dark" onClick={newRecipe}>
            + New
          </button>
        </div>
      </header>

      <input
        className="input input-surface"
        placeholder="Search tags, then titles &amp; ingredients"
        value={state.query}
        onChange={(e) => setState({ query: e.target.value })}
        aria-label="Search recipes"
      />

      {/* Pantry quick filters */}
      <div className="chip-rail" style={{ margin: '12px -20px 0', padding: '0 20px' }}>
        {PANTRY_CHIPS.map((c) => {
          const on = state.pantryFilter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setState({ pantryFilter: c.key })}
              style={{
                border: `1px solid ${on ? 'var(--olive)' : 'var(--line)'}`,
                background: on ? 'var(--olive)' : 'var(--surface)',
                color: on ? '#fff' : 'var(--muted)',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Reserved height so the layout doesn't jump as the note changes. */}
      <div style={{ height: 16, fontSize: 12, color: 'var(--muted-3)', padding: '6px 2px 0' }}>
        {state.pantryFilter !== 'off'
          ? `${shown.length} of ${list.length} — measured against the pantry`
          : note}
      </div>

      {/* Tier 1: All, categories, and any ungrouped tag */}
      <div className="chip-rail" style={{ margin: '4px -20px 0', padding: '0 20px' }}>
        <button
          onClick={() => {
            setState({ activeTag: null });
            setExpandedCategory(null);
            setExpandedGroup(null);
          }}
          style={{
            border: `1px solid ${!state.activeTag ? 'var(--ink)' : 'var(--line)'}`,
            background: !state.activeTag ? 'var(--ink)' : 'var(--surface)',
            color: !state.activeTag ? 'var(--paper)' : 'var(--muted)',
          }}
        >
          All {state.recipes.length}
        </button>
        {categories.map((cat) => {
          const on = state.activeTag === cat.label;
          const open = expandedCategory === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => {
                setState({ activeTag: cat.label });
                setExpandedCategory(open ? null : cat.label);
                setExpandedGroup(null);
              }}
              aria-expanded={open}
              style={{
                border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                background: on ? 'var(--ink)' : 'var(--surface)',
                color: on ? 'var(--paper)' : 'var(--muted)',
              }}
            >
              {cat.label} · {cat.total}
              {open ? ' ▴' : ' ▾'}
            </button>
          );
        })}
        {tags.map((c) => {
          const on = state.activeTag === c.tag;
          return (
            <button
              key={c.tag}
              onClick={() => {
                setState({ activeTag: c.tag });
                setExpandedCategory(null);
                setExpandedGroup(null);
              }}
              style={{
                border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                background: on ? 'var(--ink)' : 'var(--surface)',
                color: on ? 'var(--paper)' : 'var(--muted)',
              }}
            >
              {c.tag} · {c.count}
            </button>
          );
        })}
      </div>

      {/* Tier 2: groups within the expanded category */}
      {activeCategory && (
        <div className="chip-rail" style={{ margin: '6px -20px 0', padding: '0 20px' }}>
          {activeCategory.groups.map((g) => {
            const on = state.activeTag === g.tag;
            const open = expandedGroup === g.tag;
            const hasKids = g.children.length > 0;
            return (
              <button
                key={g.tag}
                onClick={() => {
                  setState({ activeTag: g.tag });
                  setExpandedGroup(hasKids ? (open ? null : g.tag) : null);
                }}
                aria-expanded={hasKids ? open : undefined}
                style={{
                  border: `1px solid ${on ? 'var(--terracotta)' : 'var(--line)'}`,
                  background: on ? 'var(--terracotta)' : 'var(--surface)',
                  color: on ? '#fff' : 'var(--muted)',
                }}
              >
                {g.tag} · {g.total}
                {hasKids ? (open ? ' ▴' : ' ▾') : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Tier 3: specific cuts/variants within the expanded group */}
      {activeGroup && (
        <div className="chip-rail" style={{ margin: '6px -20px 16px', padding: '0 20px' }}>
          {activeGroup.children.map((c) => {
            const on = state.activeTag === c.tag;
            return (
              <button
                key={c.tag}
                onClick={() => setState({ activeTag: c.tag })}
                style={{
                  border: `1px solid ${on ? 'var(--olive)' : 'var(--line)'}`,
                  background: on ? 'var(--olive)' : 'var(--surface)',
                  color: on ? '#fff' : 'var(--muted)',
                }}
              >
                {c.tag} · {c.count}
              </button>
            );
          })}
        </div>
      )}
      {!activeGroup && <div style={{ marginBottom: 16 }} />}

      {shown.length === 0 ? (
        <p
          className="prose"
          style={{ textAlign: 'center', padding: '50px 24px', fontSize: 14.5, color: 'var(--muted-3)' }}
        >
          {state.pantryFilter !== 'off'
            ? 'Nothing matches the pantry right now. Try “Missing ≤ 2”, or top the pantry up.'
            : `Nothing under “${state.query}”. Shelby could invent something instead.`}
        </p>
      ) : (
        <div className="recipe-grid">
          {shown.map((r) => {
            const need = matches.get(r.id)?.need ?? 0;
            return (
              <button
                key={r.id}
                onClick={() => openDetail(r.id)}
                className="card"
                style={{ textAlign: 'left', padding: '0 0 13px', overflow: 'hidden' }}
              >
                <CardWell hueA={r.hueA} hueB={r.hueB}>
                  {r.fav && (
                    <span
                      style={{
                        position: 'absolute',
                        right: 9,
                        top: 9,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,.92)',
                        color: 'var(--terracotta)',
                        fontSize: 13,
                        lineHeight: '24px',
                        textAlign: 'center',
                      }}
                      aria-label="Favourite"
                    >
                      ★
                    </span>
                  )}
                  {state.pantryFilter !== 'off' && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 9,
                        top: 9,
                        background: need === 0 ? 'var(--olive)' : 'rgba(43,35,32,.86)',
                        color: '#fff',
                        fontSize: 9.5,
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                        padding: '4px 8px',
                        borderRadius: 20,
                      }}
                    >
                      {need === 0 ? 'Ready' : `${need} to buy`}
                    </span>
                  )}
                  {r.ai && state.pantryFilter === 'off' && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 9,
                        top: 9,
                        background: 'rgba(43,35,32,.86)',
                        color: 'var(--paper)',
                        fontSize: 9.5,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        padding: '4px 8px',
                        borderRadius: 20,
                      }}
                    >
                      Shelby
                    </span>
                  )}
                </CardWell>

                <span style={{ display: 'block', padding: '11px 13px 0' }}>
                  <span
                    className="serif"
                    style={{ display: 'block', fontSize: 19, lineHeight: 1.12, color: 'var(--ink)' }}
                  >
                    {r.title}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    {r.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag-chip">
                        {t}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
