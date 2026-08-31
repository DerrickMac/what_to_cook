import type { CSSProperties } from 'react';
import { useStore } from '../store';
import { StepTimers } from './StepTimers';
import type { Recipe } from '../types';

const cell: CSSProperties = {
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  borderRadius: 8,
  padding: '7px 9px',
  font: 'inherit',
  fontSize: 14,
  color: 'var(--ink)',
};

function Arrows({ onUp, onDown, upOk, downOk }: { onUp: () => void; onDown: () => void; upOk: boolean; downOk: boolean }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', flex: 'none' }}>
      <button
        className="icon-round"
        style={{ width: 22, height: 17, fontSize: 10 }}
        disabled={!upOk}
        onClick={onUp}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        className="icon-round"
        style={{ width: 22, height: 17, fontSize: 10 }}
        disabled={!downOk}
        onClick={onDown}
        aria-label="Move down"
      >
        ↓
      </button>
    </span>
  );
}

const xBtn: CSSProperties = {
  flex: 'none',
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--danger)',
  fontSize: 14,
  lineHeight: 1,
};

/** The recipe page in edit mode — inline fields over the same layout. */
export function RecipeEditBody({ draft }: { draft: Recipe }) {
  const {
    state,
    setState,
    editField,
    addEditTag,
    removeEditTag,
    addIngredient,
    setIngredient,
    removeIngredient,
    moveIngredient,
    addSection,
    setSectionName,
    removeSection,
    addStep,
    setStep,
    removeStep,
    moveStep,
    setDraftTimer,
    removeDraftTimer,
    askDeleteRecipe,
  } = useStore();

  return (
    <div style={{ padding: '18px 20px 0' }}>
      <input
        className="serif"
        value={draft.title}
        onChange={(e) => editField({ title: e.target.value })}
        placeholder="Recipe title"
        aria-label="Title"
        style={{
          width: '100%',
          border: 'none',
          borderBottom: '1px solid var(--line)',
          background: 'transparent',
          fontSize: 30,
          lineHeight: 1.1,
          color: 'var(--ink)',
          padding: '0 0 8px',
          marginBottom: 14,
        }}
      />

      {/* Meta */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-2)' }}>
          <input
            style={{ ...cell, width: 54 }}
            inputMode="numeric"
            value={String(draft.minutes)}
            onChange={(e) => editField({ minutes: parseInt(e.target.value, 10) || 0 })}
            aria-label="Minutes"
          />
          min
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-2)' }}>
          serves
          <input
            style={{ ...cell, width: 46 }}
            inputMode="numeric"
            value={String(draft.serves)}
            onChange={(e) => editField({ serves: parseInt(e.target.value, 10) || 0 })}
            aria-label="Serves"
          />
        </label>
      </div>

      {/* Tags */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          border: '1px solid var(--line)',
          borderRadius: 12,
          background: 'var(--surface)',
          padding: '8px 10px',
          marginBottom: 20,
        }}
      >
        {draft.tags.map((t) => (
          <span
            key={t}
            className="tag-chip"
            style={{ fontSize: 12, padding: '4px 6px 4px 9px', display: 'inline-flex', gap: 5 }}
          >
            {t}
            <button
              onClick={() => removeEditTag(t)}
              aria-label={`Remove ${t}`}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted-2)' }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={state.editTagInput}
          onChange={(e) => setState({ editTagInput: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addEditTag(state.editTagInput);
            }
          }}
          placeholder="tag + enter"
          aria-label="Add a tag"
          style={{ flex: 1, minWidth: 90, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
        />
      </div>

      {/* Ingredients */}
      <section style={{ marginBottom: 8 }}>
        {draft.sections.map((sec, si) => (
          <div key={si} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="eyebrow"
                value={sec.name}
                onChange={(e) => setSectionName(si, e.target.value)}
                aria-label="Group name"
                style={{ ...cell, flex: 1, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: 11.5 }}
              />
              {draft.sections.length > 1 && (
                <button style={xBtn} onClick={() => removeSection(si)} aria-label="Remove group">
                  ×
                </button>
              )}
            </div>

            {sec.items.map((it, ii) => (
              <div key={ii} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <Arrows
                  onUp={() => moveIngredient(si, ii, -1)}
                  onDown={() => moveIngredient(si, ii, 1)}
                  upOk={ii > 0}
                  downOk={ii < sec.items.length - 1}
                />
                <input
                  style={{ ...cell, width: 74, flex: 'none' }}
                  value={it.q}
                  onChange={(e) => setIngredient(si, ii, { q: e.target.value })}
                  placeholder="qty"
                  aria-label="Quantity"
                />
                <input
                  style={{ ...cell, flex: 1, minWidth: 0 }}
                  value={it.n}
                  onChange={(e) => setIngredient(si, ii, { n: e.target.value })}
                  placeholder="ingredient"
                  aria-label="Ingredient"
                />
                <button style={xBtn} onClick={() => removeIngredient(si, ii)} aria-label="Remove ingredient">
                  ×
                </button>
              </div>
            ))}

            <button
              className="pill"
              style={{ marginTop: 4, padding: '5px 12px', fontSize: 12, borderStyle: 'dashed', color: 'var(--muted-2)' }}
              onClick={() => addIngredient(si)}
            >
              + ingredient
            </button>
          </div>
        ))}

        <button
          className="pill"
          style={{ padding: '6px 13px', fontSize: 12.5, color: 'var(--muted)' }}
          onClick={addSection}
        >
          + add a group
        </button>
      </section>

      {/* Directions */}
      <section style={{ margin: '22px 0 24px' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Directions
        </div>
        {draft.steps.map((text, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <span
              className="serif"
              style={{ width: 20, flex: 'none', fontSize: 20, lineHeight: 1.4, color: 'var(--terracotta)' }}
            >
              {i + 1}
            </span>
            <Arrows
              onUp={() => moveStep(i, -1)}
              onDown={() => moveStep(i, 1)}
              upOk={i > 0}
              downOk={i < draft.steps.length - 1}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <textarea
                className="textarea"
                rows={2}
                value={text}
                onChange={(e) => setStep(i, e.target.value)}
                placeholder="Describe this step"
                aria-label={`Step ${i + 1}`}
                style={{ minHeight: 52, fontSize: 14.5 }}
              />
              <StepTimers
                timer={draft.timers.find((t) => t.stepIndex === i)}
                stepIndex={i}
                text={text}
                editing
                onSet={(label, minutes) => setDraftTimer(i, label, minutes)}
                onRemove={() => removeDraftTimer(i)}
              />
            </div>
            <button style={xBtn} onClick={() => removeStep(i)} aria-label="Remove step">
              ×
            </button>
          </div>
        ))}
        <button
          className="pill"
          style={{ padding: '6px 13px', fontSize: 12.5, color: 'var(--muted)' }}
          onClick={addStep}
        >
          + add a step
        </button>
      </section>

      {!state.editNew && (
        <button
          className="btn"
          style={{
            width: '100%',
            marginBottom: 8,
            padding: '13px 12px',
            fontSize: 15,
            background: 'transparent',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
          }}
          onClick={() => askDeleteRecipe(draft)}
        >
          Delete this recipe
        </button>
      )}
    </div>
  );
}
