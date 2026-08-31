import { useStore } from '../store';
import { CircleMark } from '../components/CircleMark';
import { byId, missingForQueue, pantryHaves, pantryMatch } from '../lib/derive';
import type { Recipe } from '../types';

export function Plan() {
  const { state, go, openDetail, unplan, queueMissingToGrocery } = useStore();

  const haves = pantryHaves(state.pantry);
  const queued = state.cookQueue
    .map((id) => byId(state.recipes, id))
    .filter((r): r is Recipe => !!r);
  const totalMissing = missingForQueue(queued, haves).length;

  return (
    <div className="screen rise">
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h1 className="screen-title">Cooking soon</h1>
        <button className="pill" onClick={() => go('grocery')}>
          Grocery list
        </button>
      </header>

      {queued.length === 0 ? (
        <p
          className="prose"
          style={{ textAlign: 'center', padding: '48px 24px', fontSize: 14.5, color: 'var(--muted-3)' }}
        >
          Nothing planned yet. Open a recipe and tap <strong>Plan to cook</strong> — anything you're
          missing lands on the grocery list.
        </p>
      ) : (
        <>
          <section
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              marginBottom: 16,
              background: totalMissing === 0 ? 'var(--tint-have)' : 'var(--paper-sunk)',
              color: totalMissing === 0 ? 'var(--olive)' : 'var(--muted)',
              fontSize: 13.5,
            }}
          >
            <span>
              {totalMissing === 0
                ? '✓ You have everything for these'
                : `${totalMissing} thing${totalMissing === 1 ? '' : 's'} to buy across ${queued.length} recipe${queued.length === 1 ? '' : 's'}`}
            </span>
            {totalMissing > 0 && (
              <button
                className="pill pill-dark"
                style={{ flex: 'none' }}
                onClick={() => void queueMissingToGrocery()}
              >
                Add all to list
              </button>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queued.map((r) => {
              const m = pantryMatch(r, haves);
              return (
                <section
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 18,
                    padding: 12,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <button
                    onClick={() => openDetail(r.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                    }}
                  >
                    <CircleMark variant="tile40" hueA={r.hueA} hueB={r.hueB} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className="serif"
                        style={{ display: 'block', fontSize: 18, color: 'var(--ink)' }}
                      >
                        {r.title}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--muted-3)', marginTop: 2 }}>
                        {r.minutes} min ·{' '}
                        {m.need === 0 ? 'ready to cook' : `${m.need} to buy`}
                      </span>
                    </span>
                  </button>

                  <span
                    className="status-pill"
                    style={{
                      flex: 'none',
                      background: 'transparent',
                      border: `1px solid ${m.need === 0 ? 'var(--olive)' : 'var(--saffron)'}`,
                      color: m.need === 0 ? 'var(--olive)' : 'var(--saffron)',
                    }}
                  >
                    {m.have}/{m.have + m.need}
                  </span>

                  <button
                    className="icon-round"
                    onClick={() => unplan(r.id)}
                    aria-label={`Remove ${r.title} from Cooking soon`}
                  >
                    ×
                  </button>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
