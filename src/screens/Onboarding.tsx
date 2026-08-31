import { useStore } from '../store';
import { TripleCircles } from '../components/CircleMark';

/**
 * One-time. Gated on household membership, never on local state — once a
 * household exists this screen doesn't appear again.
 */
export function Onboarding() {
  const { state, setState, createHousehold, joinHousehold } = useStore();

  return (
    <div
      className="rise"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: `calc(34px + var(--sa-top)) 28px calc(40px + var(--sa-bottom))`,
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: 26 }}>
        <TripleCircles />
      </div>

      <h1
        className="serif"
        style={{ fontSize: 46, lineHeight: 0.96, margin: '0 0 14px', color: 'var(--ink)' }}
      >
        What
        <br />
        To Cook
      </h1>

      <p
        className="prose"
        style={{ fontSize: 15.5, lineHeight: 1.5, color: 'var(--muted)', margin: '0 0 30px' }}
      >
        One cookbook, one pantry, one plan — shared between the two of you.
      </p>

      {/* Create */}
      <section className="card" style={{ padding: 20, marginBottom: 18, boxShadow: 'none' }}>
        <h2 className="serif" style={{ fontSize: 24, margin: '0 0 4px', color: 'var(--ink)' }}>
          Create a household
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--muted-2)', margin: '0 0 14px' }}>
          Name your kitchen. You'll get an invite code to share.
        </p>
        <input
          className="input"
          placeholder="e.g. Flat 3 Kitchen"
          value={state.householdName}
          onChange={(e) => setState({ householdName: e.target.value })}
          aria-label="Household name"
          style={{ marginBottom: 12 }}
        />
        <button className="btn btn-primary" onClick={() => void createHousehold()}>
          Create household
        </button>
      </section>

      {/* OR rule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 18px' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span
          style={{
            fontSize: 12,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--muted-3)',
          }}
        >
          or
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      {/* Join */}
      <section
        style={{
          border: '1px dashed var(--line-dash)',
          borderRadius: 20,
          padding: 20,
          background: 'transparent',
        }}
      >
        <h2 className="serif" style={{ fontSize: 24, margin: '0 0 4px', color: 'var(--ink)' }}>
          Join a household
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--muted-2)', margin: '0 0 14px' }}>
          Enter the six-character code from your partner.
        </p>
        <div style={{ display: 'flex', gap: 9 }}>
          <input
            className="input"
            placeholder="ADOBO7"
            value={state.inviteCode}
            onChange={(e) => setState({ inviteCode: e.target.value })}
            aria-label="Invite code"
            style={{ flex: 1, letterSpacing: '.22em', textTransform: 'uppercase' }}
          />
          <button
            className="btn btn-outline"
            style={{ width: 'auto', padding: '13px 20px', fontSize: 15 }}
            onClick={() => void joinHousehold()}
          >
            Join
          </button>
        </div>
      </section>
    </div>
  );
}
