import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import * as api from '../api';
import { DEFAULT_AISLES } from '../types';
import type { Status } from '../types';

const STATUSES: Status[] = ['have', 'low', 'out'];

/** The pantry-item editor, on its own screen (the form was too tall for a modal). */
export function PantryItem() {
  const { state, addPantry, deletePantry, editIngredient, uploadPantryPhoto, closePantryItem } =
    useStore();
  const editing = state.pantryEditId;
  const item = editing && editing !== 'new' ? state.pantry.find((p) => p.id === editing) : null;

  const aisleNames = state.aisles.length ? state.aisles.map((a) => a.name) : DEFAULT_AISLES;

  const [name, setName] = useState(item?.name ?? '');
  const [cat, setCat] = useState<string>(item?.cat ?? aisleNames[0] ?? 'Pantry');
  const [status, setStatus] = useState<Status>(item?.status ?? 'out');
  const [allIng, setAllIng] = useState<{ id: string; name: string }[]>([]);
  const [photoOpen, setPhotoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listIngredients().then(setAllIng).catch(() => {});
  }, []);

  useEffect(() => {
    if (!photoOpen) return;
    const close = () => setPhotoOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoOpen]);

  // Nothing selected — bounce home.
  if (!editing) {
    return null;
  }

  const save = async () => {
    if (editing === 'new') {
      if (!name.trim()) return;
      await addPantry(name, cat, status);
    } else if (item) {
      if (name.trim() && name.trim() !== item.name) editIngredient(item, { name });
      if (cat !== item.cat) editIngredient(item, { category: cat });
    }
    closePantryItem();
  };

  return (
    <div className="screen rise">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '8px 0 20px',
        }}
      >
        <button
          onClick={closePantryItem}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, color: 'var(--muted)' }}
        >
          Cancel
        </button>
        <span className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>
          {editing === 'new' ? 'Add to pantry' : 'Edit item'}
        </span>
        <button
          onClick={save}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--terracotta)',
          }}
        >
          {editing === 'new' ? 'Add' : 'Save'}
        </button>
      </header>

      {item?.imageUrl && (
        <button
          type="button"
          onClick={() => setPhotoOpen(true)}
          aria-label={`View full-size photo of ${item.name}`}
          style={{
            display: 'block',
            width: '100%',
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'zoom-in',
            marginBottom: 18,
          }}
        >
          <img
            src={item.imageUrl}
            alt=""
            style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 16, display: 'block' }}
          />
        </button>
      )}

      {photoOpen && item?.imageUrl && (
        <div
          className="scrim scrim-center rise-fast"
          role="dialog"
          aria-modal="true"
          aria-label={`${item.name} photo`}
          onClick={() => setPhotoOpen(false)}
        >
          <img
            src={item.imageUrl}
            alt={item.name}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow: 'var(--shadow-toast)',
            }}
          />
          <button
            className="icon-round"
            onClick={() => setPhotoOpen(false)}
            aria-label="Close"
            style={{ position: 'fixed', top: 'calc(16px + var(--sa-top))', right: 16 }}
          >
            ×
          </button>
        </div>
      )}

      <div className="eyebrow" style={{ marginBottom: 6 }}>
        Name
      </div>
      <input
        className="input input-surface"
        list="pantry-ingredient-names"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Gochujang"
        aria-label="Ingredient name"
        style={{ marginBottom: 18 }}
      />
      <datalist id="pantry-ingredient-names">
        {allIng.map((x) => (
          <option key={x.id} value={x.name} />
        ))}
      </datalist>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Aisle
          </div>
          <select
            className="input input-surface"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Aisle"
          >
            {aisleNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {!aisleNames.includes(cat) && <option value={cat}>{cat}</option>}
          </select>
        </div>
        {editing === 'new' && (
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Status
            </div>
            <select
              className="input input-surface"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              aria-label="Status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {item && (
        <>
          <button
            className="btn btn-outline"
            style={{ marginBottom: 10 }}
            onClick={() => fileRef.current?.click()}
          >
            {item.imageUrl ? 'Replace photo' : 'Add a photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPantryPhoto(item, f);
            }}
          />

          <button
            className="btn"
            style={{
              background: 'transparent',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
            }}
            onClick={() => {
              if (confirm(`Remove "${item.name}" from the pantry?`)) {
                deletePantry(item);
                closePantryItem();
              }
            }}
          >
            Remove from pantry
          </button>
        </>
      )}
    </div>
  );
}
