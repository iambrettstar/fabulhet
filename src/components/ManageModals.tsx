import { useRef } from 'react';
import { useNovelStore } from '../store';
import type { ColumnType } from '../types';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function CharactersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const characters = useNovelStore((s) => s.characters);
  const addCharacter = useNovelStore((s) => s.addCharacter);
  const updateCharacter = useNovelStore((s) => s.updateCharacter);
  const removeCharacter = useNovelStore((s) => s.removeCharacter);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Characters"
      footer={
        <button className="btn btn-primary" onClick={() => addCharacter()}>
          + Add character
        </button>
      }
    >
      {characters.length === 0 && (
        <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem' }}>
          No characters yet. Add people who appear across your scenes — then filter timelines by them.
        </p>
      )}
      <div className="manage-list">
        {characters.map((c) => (
          <div key={c.id} className="manage-item">
            <label className="color-swatch" style={{ background: c.color }}>
              <input
                type="color"
                value={c.color}
                onChange={(e) => updateCharacter(c.id, { color: e.target.value })}
              />
            </label>
            <input
              type="text"
              value={c.name}
              onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
            />
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (confirm(`Remove ${c.name}?`)) removeCharacter(c.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function TagsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tags = useNovelStore((s) => s.tags);
  const addTag = useNovelStore((s) => s.addTag);
  const updateTag = useNovelStore((s) => s.updateTag);
  const removeTag = useNovelStore((s) => s.removeTag);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tags"
      footer={
        <button className="btn btn-primary" onClick={() => addTag()}>
          + Add tag
        </button>
      }
    >
      {tags.length === 0 && (
        <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem' }}>
          Tags let you filter by theme, subplot, tone, or anything else — Mystery, Betrayal, Midpoint…
        </p>
      )}
      <div className="manage-list">
        {tags.map((t) => (
          <div key={t.id} className="manage-item">
            <label className="color-swatch" style={{ background: t.color }}>
              <input
                type="color"
                value={t.color}
                onChange={(e) => updateTag(t.id, { color: e.target.value })}
              />
            </label>
            <input
              type="text"
              value={t.name}
              onChange={(e) => updateTag(t.id, { name: e.target.value })}
            />
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (confirm(`Remove tag ${t.name}?`)) removeTag(t.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function ColumnsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const columns = useNovelStore((s) => s.columns);
  const addColumn = useNovelStore((s) => s.addColumn);
  const updateColumn = useNovelStore((s) => s.updateColumn);
  const removeColumn = useNovelStore((s) => s.removeColumn);
  const reorderColumns = useNovelStore((s) => s.reorderColumns);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Columns"
      footer={
        <button className="btn btn-primary" onClick={() => addColumn()}>
          + Add column
        </button>
      }
    >
      <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Customise plot-grid headings. Rename freely — Act, Arc, POV, Theme, or invent your own.
      </p>
      <div className="manage-list">
        {columns.map((col, idx) => (
          <div key={col.id} className="manage-item">
            <button
              className="btn-icon"
              title="Move up"
              disabled={idx === 0}
              onClick={() => reorderColumns(idx, idx - 1)}
            >
              ↑
            </button>
            <button
              className="btn-icon"
              title="Move down"
              disabled={idx === columns.length - 1}
              onClick={() => reorderColumns(idx, idx + 1)}
            >
              ↓
            </button>
            <input
              type="text"
              value={col.name}
              onChange={(e) => updateColumn(col.id, { name: e.target.value })}
            />
            <select
              className="col-type-select"
              value={col.type}
              onChange={(e) => {
                const type = e.target.value as ColumnType;
                updateColumn(col.id, {
                  type,
                  options: type === 'select' ? col.options ?? ['I', 'II', 'III'] : undefined,
                });
              }}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
              <option value="longtext">Long text</option>
            </select>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (confirm(`Remove column "${col.name}"?`)) removeColumn(col.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {columns.some((c) => c.type === 'select') && (
        <div style={{ marginTop: '0.75rem' }}>
          {columns
            .filter((c) => c.type === 'select')
            .map((col) => (
              <div className="field" key={col.id} style={{ marginBottom: '0.5rem' }}>
                <label>Options for “{col.name}” (comma-separated)</label>
                <input
                  value={(col.options ?? []).join(', ')}
                  onChange={(e) => {
                    const options = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    updateColumn(col.id, { options });
                  }}
                />
              </div>
            ))}
        </div>
      )}
    </Modal>
  );
}

export function DataMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const exportJSON = useNovelStore((s) => s.exportJSON);
  const importJSON = useNovelStore((s) => s.importJSON);
  const resetToSample = useNovelStore((s) => s.resetToSample);
  const clearAll = useNovelStore((s) => s.clearAll);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const doExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${useNovelStore.getState().title.replace(/\s+/g, '-').toLowerCase() || 'novel'}.fabulhet.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJSON(String(reader.result));
      if (!ok) alert('Could not import that file. Expect a Fabulhet JSON export.');
      onClose();
    };
    reader.readAsText(file);
  };

  return (
    <div className="menu-dropdown" style={{ minWidth: 200 }}>
      <button className="menu-item" onClick={doExport}>
        Export JSON
      </button>
      <button className="menu-item" onClick={() => fileRef.current?.click()}>
        Import JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doImport(f);
          e.target.value = '';
        }}
      />
      <div className="menu-divider" />
      <button
        className="menu-item"
        onClick={() => {
          if (confirm('Replace current project with the sample novel?')) {
            resetToSample();
            onClose();
          }
        }}
      >
        Load sample novel
      </button>
      <button
        className="menu-item danger"
        onClick={() => {
          if (confirm('Clear all scenes, characters, and tags? This cannot be undone.')) {
            clearAll();
            onClose();
          }
        }}
      >
        Clear project
      </button>
    </div>
  );
}
