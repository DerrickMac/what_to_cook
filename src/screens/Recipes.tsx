import { useStore } from '../store';
import { CardWell } from '../components/CircleMark';
import { filterRecipes, tagCounts, pantryMatch, pantryHaves } from '../lib/derive';

const PANTRY_CHIPS = [
  { key: 'off', label: 'All recipes' },
  { key: 'ready', label: 'Can make now' },
  { key: 'almost', label: 'Missing ≤ 2' },
] as const;

export function Recipes() {
  const { state, setState, openDetail, newRecipe } = useStore();
  const { list, note } = filterRecipes(state.recipes, state.query, state.activeTag);

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

  // tag chips: All first, then alphabetical
  const tags = [...tagCounts(state.recipes)].sort((a, b) => a.tag.localeCompare(b.tag));
  const chips = [{ tag: null as string | null, count: state.recipes.length }, ...tags];

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

      <div className="chip-rail" style={{ margin: '4px -20px 16px', padding: '0 20px' }}>
        {chips.map((c) => {
          const on = state.activeTag === c.tag;
          return (
            <button
              key={c.tag ?? '__all'}
              onClick={() => setState({ activeTag: c.tag })}
              style={{
                border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                background: on ? 'var(--ink)' : 'var(--surface)',
                color: on ? 'var(--paper)' : 'var(--muted)',
              }}
            >
              {c.tag ? `${c.tag} · ${c.count}` : `All ${c.count}`}
            </button>
          );
        })}
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
