import { useState } from 'react';
import { useStore } from '../store';

/** Centred modal for managing the pantry / grocery aisles. */
export function AislesSheet() {
  const { state, setState, addAisle, renameAisle, deleteAisle, moveAisle } = useStore();
  const [adding, setAdding] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!state.aislesOpen) return null;
  const close = () => setState({ aislesOpen: false });

  const startEdit = (id: string, name: string) => {
    setEditId(id);
    setEditName(name);
  };
  const commitEdit = () => {
    if (editId) renameAisle(editId, editName);
    setEditId(null);
    setEditName('');
  };
  const submitAdd = () => {
    if (!adding.trim()) return;
    void addAisle(adding);
    setAdding('');
  };

  return (
    <div
      className="scrim scrim-center rise-fast"
      role="dialog"
      aria-modal="true"
      aria-label="Aisles"
      onClick={close}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div className="serif" style={{ fontSize: 23, color: 'var(--ink)' }}>
            Aisles
          </div>
          <button className="icon-round" onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal-body">
          <p className="prose" style={{ fontSize: 13, color: 'var(--muted-3)', margin: '0 0 14px' }}>
            The order here is the order the pantry and grocery list are grouped in. Deleting an aisle
            moves its items to the one above.
          </p>

          <div className="list-container" style={{ marginBottom: 16 }}>
            {state.aisles.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none' }}>
                  <button
                    className="icon-round"
                    style={{ width: 22, height: 18, fontSize: 11 }}
                    disabled={i === 0}
                    onClick={() => moveAisle(a.id, -1)}
                    aria-label={`Move ${a.name} up`}
                  >
                    ↑
                  </button>
                  <button
                    className="icon-round"
                    style={{ width: 22, height: 18, fontSize: 11 }}
                    disabled={i === state.aisles.length - 1}
                    onClick={() => moveAisle(a.id, 1)}
                    aria-label={`Move ${a.name} down`}
                  >
                    ↓
                  </button>
                </span>

                {editId === a.id ? (
                  <input
                    className="input input-surface"
                    style={{ flex: 1 }}
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditId(null);
                    }}
                    onBlur={commitEdit}
                    aria-label={`Rename ${a.name}`}
                  />
                ) : (
                  <button
                    onClick={() => startEdit(a.id, a.name)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 15,
                      color: 'var(--ink)',
                    }}
                  >
                    {a.name}
                  </button>
                )}

                <button
                  className="icon-round"
                  style={{ flex: 'none', color: 'var(--danger)' }}
                  disabled={state.aisles.length <= 1}
                  onClick={() => {
                    if (confirm(`Delete the "${a.name}" aisle? Its items move to another aisle.`))
                      deleteAisle(a.id);
                  }}
                  aria-label={`Delete ${a.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input input-surface"
              placeholder="New aisle"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
              aria-label="New aisle name"
            />
            <button className="pill pill-dark" style={{ flex: 'none' }} onClick={submitAdd}>
              Add
            </button>
          </div>
        </div>

        <footer className="sheet-foot">
          <button className="btn btn-primary" onClick={close}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
