import { useStore } from '../store';
import { TripleCircles } from '../components/CircleMark';
import { byId } from '../lib/derive';

export function Sequences() {
  const { state, go, openDetail, askDeleteSequence } = useStore();

  return (
    <div className="screen rise">
      <button
        onClick={() => go('shelby')}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: 14,
          color: 'var(--terracotta)',
          marginBottom: 12,
        }}
      >
        ‹ Shelby
      </button>

      <h1 className="screen-title" style={{ fontSize: 36, marginBottom: 8 }}>
        Saved sequences
      </h1>
      <p className="prose" style={{ fontSize: 14.5, color: 'var(--muted)', margin: '0 0 24px' }}>
        Runs of meals that worked. Revisit any week.
      </p>

      {state.sequences.length === 0 ? (
        <p
          className="prose"
          style={{ textAlign: 'center', padding: '50px 24px', fontSize: 14.5, color: 'var(--muted-3)' }}
        >
          No saved sequences yet. Ask Shelby for a plan and keep the one you like.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.sequences.map((s) => {
            const titles = s.ids
              .map((id) => byId(state.recipes, id)?.title)
              .filter((t): t is string => !!t)
              .concat(s.extras || []);

            return (
              <article key={s.id} className="card" style={{ padding: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 className="serif" style={{ fontSize: 24, margin: '0 0 4px', color: 'var(--ink)' }}>
                      {s.name}
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--muted-2)', margin: 0 }}>
                      {titles.length} recipes · shares {s.shared.join(', ')}
                    </p>
                  </div>
                  <TripleCircles size={22} overlap={-9} />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '14px 0 16px' }}>
                  {titles.map((t) => (
                    <span key={t} className="tag-chip" style={{ fontSize: 12, padding: '5px 10px' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 9 }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '12px', fontSize: 14.5 }}
                    disabled={!s.ids[0]}
                    onClick={() => s.ids[0] && openDetail(s.ids[0])}
                  >
                    Open first
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '12px', fontSize: 14.5, color: 'var(--danger)' }}
                    onClick={() => askDeleteSequence(s)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
