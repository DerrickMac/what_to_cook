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
          <div className="group-head">
            <span className="eyebrow">{g.name}</span>
            <span className="group-count">{g.count}</span>
          </div>

          <div className="list-container">
            {g.items.map((item, i) => {
              const from = item.fromRecipeId ? byId(state.recipes, item.fromRecipeId) : null;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  }}
                >
                  <button
                    className="check-row"
                    style={{ flex: 1, minWidth: 0 }}
                    role="checkbox"
                    aria-checked={item.checked}
                    onClick={() => toggleGroceryRow(item)}
                  >
                    <span className="checkbox" aria-hidden="true" />

                    <span className="check-body">
                      <span className="check-name">{item.name}</span>
                      {(from || item.qty) && (
                        <span className="check-source">
                          {[item.qty, from?.title].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>

                  <button
                    className="icon-round"
                    style={{ flex: 'none', width: 26, height: 26, fontSize: 14, marginRight: 16 }}
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
