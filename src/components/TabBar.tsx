import { useStore } from '../store';
import type { Screen } from '../types';

const TABS: Array<[Screen, string]> = [
  ['recipes', 'Recipes'],
  ['pantry', 'Pantry'],
  ['plan', 'Plan'],
  ['grocery', 'List'],
];

/**
 * Recipes is home. Recipe detail and the edit form both keep "Recipes" active.
 * Shelby is deliberately *not* a tab — she's an action, not a destination.
 */
export function TabBar() {
  const { state, go } = useStore();
  const sc = state.screen;

  return (
    <div className="tabbar-wrap">
      <nav className="tabbar" aria-label="Main">
        {TABS.map(([id, label]) => {
          const on =
            sc === id ||
            (id === 'recipes' && sc === 'detail') ||
            (id === 'pantry' && sc === 'pantryItem');
          return (
            <button
              key={id}
              className="tab"
              aria-current={on ? 'page' : undefined}
              onClick={() => go(id)}
              style={{
                background: on ? 'var(--paper-sunk)' : 'transparent',
                color: on ? 'var(--ink)' : 'var(--muted-3)',
                fontWeight: on ? 500 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <button className="fab" onClick={() => go('shelby')}>
        <span className="dot" style={{ width: 9, height: 9, background: 'rgba(255,255,255,.85)' }} />
        Ask Shelby
      </button>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="toast rise-toast" role="status" aria-live="polite">
      {text}
    </div>
  );
}
