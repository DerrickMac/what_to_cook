import { useStore } from '../store';
import { groupByCategory, statusColor } from '../lib/derive';
import type { Status } from '../types';

const STATUSES: Status[] = ['have', 'low', 'out'];
const FILTERS: Array<{ key: Status | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'have', label: 'Have' },
  { key: 'low', label: 'Low' },
  { key: 'out', label: 'Out' },
];

export function Pantry() {
  const { state, setState, setPantryStatus, openPantryItem } = useStore();

  const q = state.pantryQuery.trim().toLowerCase();
  const filtered = state.pantry.filter(
    (i) =>
      (state.pantryStatusFilter === 'all' || i.status === state.pantryStatusFilter) &&
      (!q || i.name.toLowerCase().includes(q))
  );
  const groups = groupByCategory(
    filtered,
    (i) => i.cat,
    state.aisles.map((a) => a.name)
  );
  const count = (s: Status | 'all') =>
    s === 'all' ? state.pantry.length : state.pantry.filter((i) => i.status === s).length;

  return (
    <div className="screen rise">
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <h1 className="screen-title">Pantry</h1>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button className="pill" onClick={() => setState({ aislesOpen: true })}>
            Aisles
          </button>
          <button className="pill pill-dark" onClick={() => openPantryItem('new')}>
            + Add
          </button>
        </div>
      </header>

      <input
        className="input input-surface"
        placeholder="Search the pantry"
        value={state.pantryQuery}
        onChange={(e) => setState({ pantryQuery: e.target.value })}
        aria-label="Search the pantry"
      />

      <div className="chip-rail" style={{ margin: '12px -20px 18px', padding: '0 20px' }}>
        {FILTERS.map((f) => {
          const on = state.pantryStatusFilter === f.key;
          const c = f.key === 'all' ? 'var(--ink)' : statusColor(f.key);
          return (
            <button
              key={f.key}
              onClick={() => setState({ pantryStatusFilter: f.key })}
              style={{
                border: `1px solid ${on ? c : 'var(--line)'}`,
                background: on ? c : 'var(--surface)',
                color: on ? '#fff' : 'var(--muted)',
              }}
            >
              {f.label} · {count(f.key)}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p
          className="prose"
          style={{ textAlign: 'center', padding: '48px 24px', fontSize: 14.5, color: 'var(--muted-3)' }}
        >
          Nothing here. {q ? 'Try another search' : 'Add an item'}.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.name} style={{ marginBottom: 22 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 9,
              }}
            >
              <span className="eyebrow">{g.name}</span>
              <span style={{ fontSize: 12, color: 'var(--muted-3)' }}>{g.count}</span>
            </div>

            <div className="list-container">
              {g.items.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px 10px 12px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', flex: 'none' }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        flex: 'none',
                        background: 'var(--paper-sunk)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        className="dot"
                        style={{ width: 8, height: 8, background: statusColor(item.status) }}
                      />
                    </span>
                  )}

                  <button
                    onClick={() => openPantryItem(item.id)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 15, color: 'var(--ink)' }}>{item.name}</span>
                    {item.brand && (
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted-3)' }}>
                        {item.brand}
                      </span>
                    )}
                  </button>

                  <select
                    value={item.status}
                    onChange={(e) => setPantryStatus(item, e.target.value as Status)}
                    aria-label={`${item.name} status`}
                    style={{
                      flex: 'none',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      border: `1px solid ${statusColor(item.status)}`,
                      background: 'var(--surface)',
                      color: statusColor(item.status),
                      font: 'inherit',
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '5px 10px',
                      borderRadius: 20,
                    }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} style={{ color: 'var(--ink)' }}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

    </div>
  );
}
