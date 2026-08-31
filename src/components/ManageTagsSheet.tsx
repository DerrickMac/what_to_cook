import { useStore } from '../store';
import { tagCounts } from '../lib/derive';

/**
 * Renaming rewrites the label on every recipe (and the active filter);
 * deleting strips it from every recipe. Neither touches recipe content.
 * Delete is two-step in place — the button reads "Sure?" before it commits.
 */
export function ManageTagsSheet() {
  const { state, setState, commitTagRename, commitTagDelete } = useStore();
  if (!state.tagsOpen) return null;

  const tags = tagCounts(state.recipes);
  const close = () =>
    setState({ tagsOpen: false, renamingTag: null, deleteTagPending: null });

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-label="Manage tags" onClick={close}>
      <div className="sheet sheet-in" style={{ maxHeight: '82%' }} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <div className="serif" style={{ fontSize: 25, color: 'var(--ink)' }}>
              Manage tags
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 2 }}>
              Renaming updates every recipe using it.
            </div>
          </div>
          <button className="icon-round" onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        <div className="sheet-body">
          {tags.map(({ tag, count }) => {
            const editing = state.renamingTag === tag;
            const pending = state.deleteTagPending === tag;

            return (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '13px 0',
                  borderBottom: '1px solid var(--line-soft-2)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editing ? (
                    <input
                      autoFocus
                      className="input input-surface"
                      style={{ borderColor: 'var(--terracotta)', padding: '9px 11px', fontSize: 14 }}
                      value={state.tagRenameDraft}
                      onChange={(e) => setState({ tagRenameDraft: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && commitTagRename(tag)}
                      aria-label={`Rename ${tag}`}
                    />
                  ) : (
                    <>
                      <span className="tag-chip" style={{ fontSize: 12.5, padding: '5px 10px' }}>
                        {tag}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--muted-3)', marginLeft: 9 }}>
                        {count} {count === 1 ? 'recipe' : 'recipes'}
                      </span>
                    </>
                  )}
                </div>

                <button
                  className="pill"
                  style={{ color: editing ? 'var(--terracotta)' : 'var(--muted)' }}
                  onClick={() =>
                    editing
                      ? commitTagRename(tag)
                      : setState({ renamingTag: tag, tagRenameDraft: tag, deleteTagPending: null })
                  }
                >
                  {editing ? 'Done' : 'Rename'}
                </button>

                <button
                  className="pill"
                  style={{ color: 'var(--danger)' }}
                  onClick={() =>
                    pending
                      ? commitTagDelete(tag)
                      : setState({ deleteTagPending: tag, renamingTag: null })
                  }
                >
                  {pending ? 'Sure?' : 'Delete'}
                </button>
              </div>
            );
          })}
        </div>

        <footer className="sheet-foot">
          <button className="btn btn-outline" onClick={close}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
