import { useEffect, useState } from 'react';
import type { Status } from '../types';
import { useStore } from '../store';
import { DetailWell } from '../components/CircleMark';
import { StepTimers } from '../components/StepTimers';
import { RecipeEditBody } from '../components/RecipeEditBody';
import { allIngredients, byId, pantryHaves, pantryMatch, statusColor } from '../lib/derive';

export function Detail() {
  const [menuKey, setMenuKey] = useState<string | null>(null);

  useEffect(() => {
    if (!menuKey) return;
    const close = () => setMenuKey(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuKey]);

  const {
    state,
    back,
    openDetail,
    toggleFav,
    startEdit,
    saveEdit,
    discardEdit,
    chooseIngredient,
    planToCook,
    unplan,
  } = useStore();

  const editing = !!state.editDraft;
  const recipe = state.editDraft ?? byId(state.recipes, state.detailId) ?? state.recipes[0];
  if (!recipe) return null;

  const haves = pantryHaves(state.pantry);
  const match = pantryMatch(recipe, haves);
  const queued = state.cookQueue.includes(recipe.id);
  const pantryStatus = (ingredientId?: string): Status | null => {
    if (!ingredientId) return null;
    return state.pantry.find((p) => p.ingredientId === ingredientId)?.status ?? 'out';
  };

  return (
    <div className="rise" style={{ paddingBottom: 130 }}>
      <DetailWell hueA={recipe.hueA} hueB={recipe.hueB}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '14px 16px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          {editing ? (
            <>
              <button className="pill" style={{ background: 'var(--surface)' }} onClick={discardEdit}>
                {state.editNew ? 'Cancel' : 'Discard'}
              </button>
              <button className="pill pill-dark" onClick={() => void saveEdit()}>
                Done
              </button>
            </>
          ) : (
            <>
              <button className="icon-round" onClick={back} aria-label="Back">
                ‹
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="icon-round"
                  onClick={toggleFav}
                  aria-label={recipe.fav ? 'Remove from favourites' : 'Add to favourites'}
                  style={{ color: 'var(--terracotta)' }}
                >
                  {recipe.fav ? '★' : '☆'}
                </button>
                <button className="pill" style={{ background: 'var(--surface)' }} onClick={startEdit}>
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      </DetailWell>

      {editing ? (
        <RecipeEditBody draft={recipe} />
      ) : (
        <div style={{ padding: '18px 20px 0' }}>
          <h1
            className="serif prose"
            style={{ fontSize: 34, lineHeight: 1.03, margin: '0 0 10px', color: 'var(--ink)' }}
          >
            {recipe.title}
          </h1>

          {recipe.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {recipe.tags.map((t) => (
                <span key={t} className="tag-chip" style={{ fontSize: 11.5, padding: '4px 9px' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 14,
              fontSize: 13,
              color: 'var(--muted-2)',
              paddingBottom: 14,
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span>{recipe.minutes} min</span>
            <span>·</span>
            <span>serves {recipe.serves}</span>
            <span>·</span>
            <span>{allIngredients(recipe).length} ingredients</span>
          </div>

          <button
            className={queued ? 'btn btn-outline' : 'btn btn-primary'}
            style={{ width: '100%', marginTop: 14, padding: '14px 12px', fontSize: 15 }}
            onClick={() => (queued ? unplan(recipe.id) : planToCook(recipe))}
          >
            {queued ? 'In Cooking soon — tap to remove' : 'Plan to cook'}
          </button>

          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 13.5,
              background: match.need === 0 ? 'var(--tint-have)' : 'var(--paper-sunk)',
              color: match.need === 0 ? 'var(--olive)' : 'var(--muted)',
            }}
          >
            {match.need === 0
              ? '✓ You have everything for this'
              : `You have ${match.have} of ${match.have + match.need} — ${match.need} to buy`}
          </div>

          {/* Ingredients */}
          <section style={{ paddingTop: 20 }}>
            {recipe.sections.map((sec, si) => (
              <div key={sec.name} style={{ marginBottom: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {sec.name}
                </div>
                {sec.items.map((item, i) =>
                  item.link ? (
                    <div
                      key={item.n + i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--line-soft)',
                      }}
                    >
                      <span style={{ fontSize: 13.5, color: 'var(--muted-2)', flex: 'none', minWidth: 62 }}>
                        {item.q}
                      </span>
                      <button
                        onClick={() => openDetail(item.link!)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          background: 'var(--link-chip-bg)',
                          border: '1px solid var(--link-chip-border)',
                          color: 'var(--link-chip-ink)',
                          borderRadius: 20,
                          padding: '7px 12px',
                          fontSize: 14,
                        }}
                      >
                        <span className="dot" style={{ width: 7, height: 7, background: 'var(--olive)' }} />
                        {item.n}
                        <span aria-hidden="true">↗</span>
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const st = pantryStatus(item.ingredientId);
                      const set = st === 'have' || st === 'low' ? st : '';
                      const key = `${si}:${i}`;
                      const open = menuKey === key;
                      const pick = (v: 'have' | 'low' | 'buy') => {
                        void chooseIngredient(recipe, item, v);
                        setMenuKey(null);
                      };
                      return (
                        <div
                          key={item.n + i}
                          className="ing-row"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '9px 0',
                            borderBottom: '1px solid var(--line-soft)',
                          }}
                        >
                          <span
                            className="dot"
                            style={{
                              width: 7,
                              height: 7,
                              flex: 'none',
                              background: set ? statusColor(set) : 'var(--line-dash)',
                            }}
                          />
                          <span
                            style={{
                              flex: 'none',
                              minWidth: 62,
                              fontSize: 13.5,
                              color: 'var(--muted-2)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {item.q}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 15.5, color: 'var(--ink)' }}>
                            {item.n}
                          </span>

                          <button
                            className="ing-status"
                            data-status={set || 'unset'}
                            aria-haspopup="menu"
                            aria-expanded={open}
                            aria-label={`${item.n} — set status`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => setMenuKey(open ? null : key)}
                          />
                          <div
                            className="ing-menu"
                            role="menu"
                            hidden={!open}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <button className="is-have" role="menuitem" onClick={() => pick('have')}>
                              <span>Have it</span>
                            </button>
                            <button className="is-low" role="menuitem" onClick={() => pick('low')}>
                              <span>Running low</span>
                            </button>
                            <button className="is-add" role="menuitem" onClick={() => pick('buy')}>
                              Add to list
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )
                )}
              </div>
            ))}
          </section>

          {/* Directions */}
          <section style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Directions
            </div>
            {recipe.steps.map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <span
                  className="serif"
                  style={{ width: 26, flex: 'none', fontSize: 24, lineHeight: 1, color: 'var(--terracotta)' }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="prose"
                    style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: 'var(--ink-2)' }}
                  >
                    {text}
                  </p>
                  <StepTimers
                    timer={recipe.timers.find((t) => t.stepIndex === i)}
                    stepIndex={i}
                    text={text}
                    editing={false}
                  />
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
