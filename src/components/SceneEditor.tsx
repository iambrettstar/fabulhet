import { useNovelStore } from '../store';

export function SceneEditor() {
  const selectedSceneId = useNovelStore((s) => s.selectedSceneId);
  const scenes = useNovelStore((s) => s.scenes);
  const columns = useNovelStore((s) => s.columns);
  const characters = useNovelStore((s) => s.characters);
  const tags = useNovelStore((s) => s.tags);
  const updateScene = useNovelStore((s) => s.updateScene);
  const updateCell = useNovelStore((s) => s.updateCell);
  const removeScene = useNovelStore((s) => s.removeScene);
  const duplicateScene = useNovelStore((s) => s.duplicateScene);
  const setSelectedSceneId = useNovelStore((s) => s.setSelectedSceneId);

  const scene = scenes.find((s) => s.id === selectedSceneId);
  const open = !!scene;

  if (!open || !scene) {
    return <aside className="sidebar closed" />;
  }

  const toggleChar = (cid: string) => {
    const next = scene.characters.includes(cid)
      ? scene.characters.filter((id) => id !== cid)
      : [...scene.characters, cid];
    updateScene(scene.id, { characters: next });
  };

  const toggleTag = (tid: string) => {
    const next = scene.tags.includes(tid)
      ? scene.tags.filter((id) => id !== tid)
      : [...scene.tags, tid];
    updateScene(scene.id, { tags: next });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Scene</h3>
        <button className="btn-icon" onClick={() => setSelectedSceneId(null)} title="Close">
          ×
        </button>
      </div>
      <div className="sidebar-body">
        <div className="order-info">
          <div className="order-box fabula">
            <div className="label">Fabula #</div>
            <div className="value">{scene.fabulaOrder + 1}</div>
          </div>
          <div className="order-box syuzhet">
            <div className="label">Syuzhet #</div>
            <div className="value">{scene.syuzhetOrder + 1}</div>
          </div>
        </div>

        <div className="field">
          <label>Title</label>
          <input
            value={scene.title}
            onChange={(e) => updateScene(scene.id, { title: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Summary</label>
          <textarea
            value={scene.summary}
            onChange={(e) => updateScene(scene.id, { summary: e.target.value })}
            placeholder="What happens in this scene?"
          />
        </div>

        {columns.map((col) => (
          <div className="field" key={col.id}>
            <label>{col.name}</label>
            {col.type === 'select' ? (
              <select
                value={scene.cells[col.id] ?? ''}
                onChange={(e) => updateCell(scene.id, col.id, e.target.value)}
              >
                <option value="">—</option>
                {(col.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : col.type === 'longtext' ? (
              <textarea
                value={scene.cells[col.id] ?? ''}
                onChange={(e) => updateCell(scene.id, col.id, e.target.value)}
              />
            ) : (
              <input
                type={col.type === 'number' ? 'number' : 'text'}
                value={scene.cells[col.id] ?? ''}
                onChange={(e) => updateCell(scene.id, col.id, e.target.value)}
              />
            )}
          </div>
        ))}

        <div className="field">
          <label>Characters</label>
          {characters.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
              No characters yet. Add some via Manage → Characters.
            </p>
          ) : (
            <div className="checkbox-list">
              {characters.map((c) => (
                <label key={c.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={scene.characters.includes(c.id)}
                    onChange={() => toggleChar(c.id)}
                  />
                  <span
                    className="chip-dot"
                    style={{ background: c.color, width: 10, height: 10, borderRadius: '50%' }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Tags</label>
          {tags.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
              No tags yet. Add some via Manage → Tags.
            </p>
          ) : (
            <div className="checkbox-list">
              {tags.map((t) => (
                <label key={t.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={scene.tags.includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                  />
                  <span
                    className="chip-dot"
                    style={{ background: t.color, width: 10, height: 10, borderRadius: '50%' }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {columns
          .filter((c) => c.type === 'select')
          .map((col) => (
            <div className="field" key={`opts-${col.id}`}>
              <label>{col.name} options (comma-separated)</label>
              <input
                value={(col.options ?? []).join(', ')}
                onChange={(e) => {
                  const options = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  useNovelStore.getState().updateColumn(col.id, { options });
                }}
                placeholder="Option 1, Option 2…"
              />
            </div>
          ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => duplicateScene(scene.id)}>
            Duplicate
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm(`Delete "${scene.title}"?`)) {
                removeScene(scene.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </aside>
  );
}
