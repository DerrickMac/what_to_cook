import { useState } from 'react';
import { fmtDuration, stepDuration } from '../lib/derive';
import { StepTimer } from './StepTimer';
import type { StepTimerDef } from '../types';

/**
 * One step's timer. In read mode it's a run-only countdown (or nothing at all,
 * so the directions don't carry an empty row). In edit mode it gains an
 * "Add a timer" / edit affordance backed by the recipe draft.
 */
export function StepTimers({
  timer,
  stepIndex,
  text,
  editing,
  onSet,
  onRemove,
}: {
  timer: StepTimerDef | undefined;
  stepIndex: number;
  text: string;
  editing: boolean;
  onSet?: (label: string, minutes: number) => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState('');

  const auto = timer ? null : stepDuration(text);

  const openDialog = (seedLabel = '', seedMinutes: number | '' = '') => {
    setLabel(seedLabel);
    setMinutes(String(seedMinutes));
    setOpen(true);
  };
  const save = () => {
    const mins = parseFloat(minutes);
    if (mins > 0) onSet?.(label, mins);
    setOpen(false);
  };

  // Read mode: show the timer if there is one (explicit or parsed), else nothing.
  if (!editing) {
    if (timer) {
      return <StepTimer label={timer.label || fmtDuration(timer.minutes)} seconds={Math.round(timer.minutes * 60)} />;
    }
    if (auto) return <StepTimer label={auto.label} seconds={auto.seconds} />;
    return null;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 }}>
      {timer && (
        <StepTimer
          label={timer.label || fmtDuration(timer.minutes)}
          seconds={Math.round(timer.minutes * 60)}
          onEdit={() => openDialog(timer.label, timer.minutes)}
        />
      )}
      {auto && (
        <StepTimer
          label={auto.label}
          seconds={auto.seconds}
          onEdit={() => openDialog('', Math.round(auto.seconds / 60))}
        />
      )}
      {!timer && !auto && (
        <button
          onClick={() => openDialog()}
          className="pill"
          style={{ padding: '5px 12px', fontSize: 12, color: 'var(--muted-2)', borderStyle: 'dashed' }}
        >
          Add a timer
        </button>
      )}

      {open && (
        <div
          className="scrim scrim-center rise-fast"
          role="dialog"
          aria-modal="true"
          aria-label="Step timer"
          onClick={() => setOpen(false)}
        >
          <div className="dialog" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-round"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ position: 'absolute', top: 14, right: 14 }}
            >
              ×
            </button>
            <div className="serif" style={{ fontSize: 21, color: 'var(--ink)', marginBottom: 4 }}>
              {timer ? 'Edit timer' : 'New timer'}
            </div>
            <div className="prose" style={{ fontSize: 12.5, color: 'var(--muted-3)', marginBottom: 16 }}>
              Step {stepIndex + 1}
            </div>

            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Minutes
            </div>
            <input
              className="input input-surface"
              inputMode="decimal"
              autoFocus
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="e.g. 12"
              aria-label="Minutes"
              style={{ marginBottom: 14 }}
            />
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Label <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </div>
            <input
              className="input input-surface"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="e.g. Rest the meat"
              aria-label="Label"
              style={{ marginBottom: 18 }}
            />

            <div style={{ display: 'flex', gap: 9 }}>
              {timer && (
                <button
                  className="btn"
                  style={{
                    flex: 'none',
                    padding: '13px 14px',
                    fontSize: 15,
                    background: 'transparent',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                  }}
                  onClick={() => {
                    onRemove?.();
                    setOpen(false);
                  }}
                >
                  Delete
                </button>
              )}
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '13px 12px', fontSize: 15 }}
                onClick={save}
              >
                {timer ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
