import { useStore } from '../store';

/**
 * Centred confirm dialog. "Keep it" is always the calm outlined option;
 * the destructive action carries the danger colour and never the fill.
 */
export function ConfirmDialog() {
  const { state, setState, runConfirm } = useStore();
  const c = state.confirm;
  if (!c) return null;

  return (
    <div
      className="scrim scrim-center rise-fast"
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
      onClick={() => setState({ confirm: null })}
    >
      <div className="dialog" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button
          className="icon-round"
          onClick={() => setState({ confirm: null })}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14 }}
        >
          ×
        </button>
        <h2
          className="serif prose"
          style={{ fontSize: 26, lineHeight: 1.15, margin: '0 40px 8px 0', color: 'var(--ink)' }}
        >
          {c.title}
        </h2>
        <p
          className="prose"
          style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--muted)', margin: '0 0 18px' }}
        >
          {c.body}
        </p>
        <div style={{ display: 'flex', gap: 9 }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1, padding: '14px 12px', fontSize: 15 }}
            onClick={() => setState({ confirm: null })}
          >
            Keep it
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '14px 12px',
              fontSize: 15,
              background: 'transparent',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
            }}
            onClick={runConfirm}
          >
            {c.action}
          </button>
        </div>
      </div>
    </div>
  );
}
