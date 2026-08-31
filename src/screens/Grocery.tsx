import { useState } from 'react';
import { useStore } from '../store';
import { byId, groupByCategory } from '../lib/derive';

export function Grocery() {
  const { state, toggleGroceryRow, addGroceryManual, deleteGroceryRow, clearCheckedGrocery } =
    useStore();
  const [draft, setDraft] = useState('');

  const order = state.aisles.map((a) => a.name);
  const groups = groupByCategory(state.grocery, (i) => i.cat, order);
  const remaining = state.grocery.filter((i) => !i.checked).length;
  const doneCount = state.grocery.length - remaining;

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    void addGroceryManual(v);
    setDraft('');
  };

  return (
    <div className="screen rise">
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h1 className="screen-title">Grocery list</h1>
        {doneCount > 0 && (
          <button className="pill" onClick={clearCheckedGrocery}>
            Clear {doneCount} done
          </button>
        )}
      </header>
      <p className="prose" style={{ fontSize: 14.5, color: 'var(--muted)', margin: '0 0 18px' }}>
        {state.grocery.length === 0
          ? 'Empty. Plan a recipe or add something below.'
          : `${remaining} left to get.`}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <input
          className="input input-surface"
          placeholder="Add an item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          aria-label="Add a grocery item"
        />
        <button className="pill pill-dark" style={{ flex: 'none' }} onClick={add}>
          Add
        </button>
      </div>

      {groups.map((g) => (
        <section key={g.name} style={{ marginBottom: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}>
            {g.name}
          </div>

          <div className="list-container">
            {g.items.map((item, i) => {
              const from = item.fromRecipeId ? byId(state.recipes, item.fromRecipeId) : null;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  }}
                >
                  <button
                    className="row-button"
                    style={{ flex: 1, minWidth: 0, gap: 12, alignItems: 'flex-start', padding: 0 }}
                    onClick={() => toggleGroceryRow(item)}
                    aria-pressed={item.checked}
                  >
                    <span
                      style={{
                        width: 21,
                        height: 21,
                        borderRadius: 6,
                        flex: 'none',
                        marginTop: 1,
                        background: item.checked ? 'var(--olive)' : 'transparent',
                        border: `1px solid ${item.checked ? 'var(--olive)' : '#D2C6B8'}`,
                        color: '#fff',
                        fontSize: 12,
                        lineHeight: '20px',
                        textAlign: 'center',
                      }}
                      aria-hidden="true"
                    >
                      {item.checked ? '✓' : ''}
                    </span>

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 15.5,
                          color: item.checked ? '#A99C91' : 'var(--ink)',
                          textDecoration: item.checked ? 'line-through' : 'none',
                        }}
                      >
                        {item.name}
                      </span>
                      {(from || item.qty) && (
                        <span
                          style={{ display: 'block', fontSize: 12, color: 'var(--muted-3)', marginTop: 3 }}
                        >
                          {[item.qty, from?.title].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>

                  <button
                    className="icon-round"
                    style={{ flex: 'none', width: 26, height: 26, fontSize: 14 }}
                    onClick={() => deleteGroceryRow(item)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
