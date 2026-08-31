import { useEffect, useRef, useState } from 'react';

/**
 * An inline countdown for a single recipe step. Tap to start, tap to pause /
 * resume, "reset" to clear. Timers live only while the recipe is open — see the
 * README for how to make them survive navigation.
 */
export function StepTimer({
  label,
  seconds,
  onEdit,
}: {
  label: string;
  seconds: number;
  /** When set, a small "edit" affordance shows next to the timer. */
  onEdit?: () => void;
}) {
  const [left, setLeft] = useState<number | null>(null); // null = not started
  const [running, setRunning] = useState(false);
  const tick = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => {
      setLeft((v) => {
        if (v === null) return v;
        if (v <= 1) {
          setRunning(false);
          try {
            navigator.vibrate?.([180, 90, 180]);
          } catch {
            /* not supported */
          }
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick.current);
  }, [running]);

  const start = () => {
    setLeft(seconds);
    setRunning(true);
  };
  const toggle = () => {
    if (left === null || left === 0) return start();
    setRunning((r) => !r);
  };
  const reset = () => {
    setRunning(false);
    setLeft(null);
  };

  const done = left === 0;
  const face =
    left === null || done
      ? label
      : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const tone = done ? 'var(--terracotta)' : running ? 'var(--olive)' : 'var(--muted)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <button
        onClick={toggle}
        className="pill"
        style={{
          padding: '5px 11px',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          borderColor: tone,
          color: tone,
          background: 'var(--surface)',
        }}
      >
        <span aria-hidden="true">{done ? '✓ ' : running ? '❚❚ ' : left === null ? '⏲ ' : '▶ '}</span>
        {done ? `${label} done` : face}
      </button>
      {left !== null && (
        <button
          onClick={reset}
          style={{ background: 'none', border: 'none', color: 'var(--muted-3)', fontSize: 12, padding: 2 }}
        >
          reset
        </button>
      )}
      {onEdit && left === null && (
        <button
          onClick={onEdit}
          aria-label={`Edit the ${label} timer`}
          style={{ background: 'none', border: 'none', color: 'var(--muted-3)', fontSize: 12, padding: 2 }}
        >
          edit
        </button>
      )}
    </span>
  );
}
