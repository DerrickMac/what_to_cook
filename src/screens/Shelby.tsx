import { useRef, useState } from 'react';
import { useStore } from '../store';
import { CircleMark } from '../components/CircleMark';
import { byId, pantryHaves, pantryMatch } from '../lib/derive';
import type { ShelbySequence } from '../types';

export function Shelby() {
  const { state } = useStore();

  return (
    <div className="screen rise">
      {state.shelbyView === 'menu' && <Menu />}
      {state.shelbyView === 'restock' && <Restock />}
      {state.shelbyView === 'cook' && <CookFromPantry />}
      {state.shelbyView === 'invent' && <Invent />}
    </div>
  );
}

/* ---------------- Menu ---------------- */

function Menu() {
  const { state, go, shelbyGo } = useStore();

  const CARDS: { view: 'restock' | 'cook' | 'invent'; title: string; body: string }[] = [
    {
      view: 'restock',
      title: 'Update my pantry from a photo',
      body: "Snap the groceries on the counter — I'll mark what I recognise as in stock.",
    },
    {
      view: 'cook',
      title: 'Cook from my pantry',
      body: 'Recipes from your cookbook you can make with what you have right now.',
    },
    {
      view: 'invent',
      title: 'Recommend a new recipe',
      body: "Something that isn't in your cookbook yet, built around what's on hand.",
    },
  ];

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            className="dot breathe"
            style={{ width: 26, height: 26, background: 'var(--terracotta)', opacity: 0.85 }}
          />
          <h1 className="screen-title">Shelby</h1>
        </div>
        <button className="pill" onClick={() => go('sequences')}>
          Saved ({state.sequences.length})
        </button>
      </header>

      <p className="prose" style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--muted)', margin: '0 0 20px' }}>
        I work from what's actually in your pantry.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CARDS.map((c) => (
          <button
            key={c.view}
            className="shelby-card"
            style={{ width: '100%', textAlign: 'left', display: 'block' }}
            onClick={() => shelbyGo(c.view)}
          >
            <div className="serif" style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 5 }}>
              {c.title}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted-2)', lineHeight: 1.45 }}>{c.body}</div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- Shared chrome ---------------- */

function SubHeader({ title }: { title: string }) {
  const { shelbyGo } = useStore();
  return (
    <header style={{ marginBottom: 16 }}>
      <button
        onClick={() => shelbyGo('menu')}
        style={{ background: 'none', border: 'none', padding: 0, fontSize: 14, color: 'var(--terracotta)' }}
      >
        ‹ Shelby
      </button>
      <h1 className="screen-title" style={{ fontSize: 32, marginTop: 8 }}>
        {title}
      </h1>
    </header>
  );
}

function Craving() {
  const { state, setState } = useStore();
  return (
    <input
      className="input input-surface"
      placeholder="Craving anything? (optional)"
      value={state.shelbyCraving}
      onChange={(e) => setState({ shelbyCraving: e.target.value })}
      aria-label="Craving"
      style={{ marginBottom: 10 }}
    />
  );
}

/* ---------------- Restock ---------------- */

function Restock() {
  const { state, identifyPhoto, toggleRestock, applyRestock } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const items = state.restock;

  return (
    <>
      <SubHeader title="Restock from a photo" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void identifyPhoto(f);
          e.target.value = '';
        }}
      />

      {state.restockBusy && (
        <p className="serif" style={{ textAlign: 'center', padding: '40px 20px', color: '#8A6F5D', fontSize: 20 }}>
          Looking at the photo…
        </p>
      )}

      {!state.restockBusy && !items && (
        <div className="card" style={{ padding: 18, boxShadow: 'none' }}>
          <p className="prose" style={{ fontSize: 14, color: 'var(--muted-2)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Lay a few things out where I can see them, or shoot one shelf at a time.
          </p>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            Take a photo
          </button>
        </div>
      )}

      {!state.restockBusy && items && (
        <>
          {items.length === 0 ? (
            <p className="prose" style={{ fontSize: 14.5, color: 'var(--muted)', margin: '10px 0 16px' }}>
              I couldn't identify anything. Try a clearer shot.
            </p>
          ) : (
            <div className="list-container" style={{ marginBottom: 16 }}>
              {items.map((it, i) => (
                <button
                  key={it.name}
                  className="row-button"
                  style={{
                    padding: '13px 14px',
                    gap: 12,
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  }}
                  onClick={() => toggleRestock(it.name)}
                  aria-pressed={it.keep}
                >
                  <span
                    style={{
                      width: 21,
                      height: 21,
                      borderRadius: 6,
                      flex: 'none',
                      background: it.keep ? 'var(--olive)' : 'transparent',
                      border: `1px solid ${it.keep ? 'var(--olive)' : '#D2C6B8'}`,
                      color: '#fff',
                      fontSize: 12,
                      lineHeight: '20px',
                      textAlign: 'center',
                    }}
                    aria-hidden="true"
                  >
                    {it.keep ? '✓' : ''}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, color: 'var(--ink)' }}>{it.name}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted-3)' }}>
                      {it.category}
                      {it.matchedIngredientId ? '' : ' · new'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 9 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
              Another photo
            </button>
            {items.length > 0 && (
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={state.restockBusy || !items.some((r) => r.keep)}
                onClick={() => void applyRestock()}
              >
                Mark {items.filter((r) => r.keep).length} as Have
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- Cook from my pantry ---------------- */

function CookFromPantry() {
  const { state, askCookNow, openDetail } = useStore();
  const [tries, setTries] = useState(0);
  const res = state.cookNow;
  const haves = pantryHaves(state.pantry);

  const run = (n: number) => {
    setTries(n);
    void askCookNow(n);
  };

  return (
    <>
      <SubHeader title="Cook from my pantry" />
      <Craving />
      <button
        className="btn btn-primary"
        style={{ marginBottom: 18 }}
        disabled={state.shelbyBusy}
        onClick={() => run(0)}
      >
        {state.shelbyBusy ? 'Checking the pantry…' : res ? 'Look again' : 'Find recipes'}
      </button>

      {res && !state.shelbyBusy && (
        <>
          <p className="serif prose" style={{ fontSize: 19, color: 'var(--ink)', margin: '0 0 14px', lineHeight: 1.25 }}>
            {res.headline}
          </p>

          {res.picks.length === 0 ? (
            <p className="prose" style={{ fontSize: 14, color: 'var(--muted-3)' }}>
              Nothing's a clean match right now. Restock a few staples and try again.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {res.picks.map((p) => {
                const r = byId(state.recipes, p.recipeId);
                if (!r) return null;
                const m = pantryMatch(r, haves);
                return (
                  <button
                    key={p.recipeId}
                    className="card"
                    style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left' }}
                    onClick={() => openDetail(p.recipeId)}
                  >
                    <CircleMark variant="tile40" hueA={r.hueA} hueB={r.hueB} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="serif" style={{ display: 'block', fontSize: 17, color: 'var(--ink)' }}>
                        {r.title}
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>
                        {p.why}
                      </span>
                    </span>
                    <span
                      className="status-pill"
                      style={{
                        flex: 'none',
                        background: 'transparent',
                        border: `1px solid ${m.need === 0 ? 'var(--olive)' : 'var(--saffron)'}`,
                        color: m.need === 0 ? 'var(--olive)' : 'var(--saffron)',
                      }}
                    >
                      {m.need === 0 ? 'ready' : `${m.need} to buy`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {res.sequence && <SequenceCard seq={res.sequence} />}

          <button className="btn btn-outline" onClick={() => run(tries + 1)}>
            Another take
          </button>
        </>
      )}
    </>
  );
}

/* ---------------- Invent ---------------- */

function Invent() {
  const { state, askInvent, saveInventedRecipe } = useStore();
  const [tries, setTries] = useState(0);
  const res = state.invent;

  const run = (n: number) => {
    setTries(n);
    void askInvent(n);
  };

  return (
    <>
      <SubHeader title="A new recipe" />
      <Craving />
      <button
        className="btn btn-primary"
        style={{ marginBottom: 18 }}
        disabled={state.shelbyBusy}
        onClick={() => run(0)}
      >
        {state.shelbyBusy ? 'Thinking it through…' : res ? 'Invent another' : 'Invent a recipe'}
      </button>

      {res && !state.shelbyBusy && (
        <>
          <p className="serif prose" style={{ fontSize: 19, color: 'var(--ink)', margin: '0 0 6px', lineHeight: 1.25 }}>
            {res.headline}
          </p>
          <p className="prose" style={{ fontSize: 13.5, color: 'var(--muted-2)', margin: '0 0 16px', lineHeight: 1.5 }}>
            {res.why}
          </p>

          <article className="card" style={{ padding: 16, marginBottom: 14 }}>
            <h2 className="serif" style={{ fontSize: 22, color: 'var(--ink)', margin: '0 0 4px' }}>
              {res.recipe.title}
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginBottom: 14 }}>
              {res.recipe.minutes} min · serves {res.recipe.serves}
            </div>

            {res.recipe.sections.map((sec) => (
              <div key={sec.name} style={{ marginBottom: 12 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {sec.name}
                </div>
                {sec.items.map((it, i) => (
                  <div key={it.n + i} style={{ display: 'flex', gap: 8, fontSize: 14, padding: '3px 0' }}>
                    <span style={{ minWidth: 58, color: 'var(--muted-2)', flex: 'none' }}>{it.q}</span>
                    <span style={{ color: 'var(--ink)' }}>{it.n}</span>
                  </div>
                ))}
              </div>
            ))}

            <div className="eyebrow" style={{ margin: '4px 0 8px' }}>
              Directions
            </div>
            <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {res.recipe.steps.map((s, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {s}
                </li>
              ))}
            </ol>
          </article>

          <button
            className="btn btn-primary"
            style={{ marginBottom: 10 }}
            onClick={() => saveInventedRecipe(res.recipe)}
          >
            Add to my recipes
          </button>
          <button className="btn btn-outline" onClick={() => run(tries + 1)}>
            Invent another
          </button>

          {res.sequence && (
            <div style={{ marginTop: 16 }}>
              <SequenceCard seq={res.sequence} />
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ---------------- Sequence card (shared) ---------------- */

function SequenceCard({ seq }: { seq: ShelbySequence }) {
  const { state, saveShelbySequence } = useStore();
  const [name, setName] = useState('');
  const titles = seq.recipeIds.map((id) => byId(state.recipes, id)?.title).filter(Boolean) as string[];

  return (
    <div
      style={{
        background: 'var(--sequence-wash)',
        border: '1px solid var(--sequence-wash-border)',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        Cook these together
      </div>
      <p style={{ fontSize: 13.5, color: '#8A6F5D', margin: '0 0 10px', lineHeight: 1.45 }}>{seq.reason}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {titles.map((t) => (
          <span key={t} className="tag-chip" style={{ fontSize: 12, padding: '5px 10px' }}>
            {t}
          </span>
        ))}
      </div>
      {seq.shared.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted-2)', marginBottom: 12 }}>
          shares {seq.shared.join(', ')}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input input-surface"
          placeholder="Name this run"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Sequence name"
        />
        <button
          className="pill pill-dark"
          style={{ flex: 'none' }}
          onClick={() => saveShelbySequence(seq, name)}
        >
          Save
        </button>
      </div>
    </div>
  );
}
