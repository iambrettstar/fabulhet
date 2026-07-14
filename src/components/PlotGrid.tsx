import { useRef, useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNovelStore } from '../store';
import type { Column, ColumnType, Scene } from '../types';

const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  longtext: 'Long text',
};

function SortableRow({
  scene,
  idx,
  columns,
  charMap,
  tagMap,
  selected,
  onSelect,
}: {
  scene: Scene;
  idx: number;
  columns: Column[];
  charMap: Record<string, { id: string; name: string; color: string }>;
  tagMap: Record<string, { id: string; name: string; color: string }>;
  selected: boolean;
  onSelect: () => void;
}) {
  const updateCell = useNovelStore((s) => s.updateCell);
  const updateScene = useNovelStore((s) => s.updateScene);
  const removeScene = useNovelStore((s) => s.removeScene);
  const duplicateScene = useNovelStore((s) => s.duplicateScene);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${selected ? 'selected' : ''} ${isDragging ? 'row-dragging' : ''}`}
      onClick={onSelect}
    >
      <td className="sticky-col row-num drag-row-cell">
        <button
          type="button"
          className="row-drag-handle"
          title="Drag to reorder (syuzhet / narrative order)"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <span className="row-index">{idx + 1}</span>
      </td>
      <td className="sticky-col cell-title" style={{ left: 52 }}>
        <input
          className="cell-input"
          value={scene.title}
          onChange={(e) => updateScene(scene.id, { title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Scene title"
        />
      </td>
      {columns.map((col) => (
        <td key={col.id} style={{ width: col.width, minWidth: col.width }}>
          {col.type === 'select' ? (
            <select
              className="cell-select"
              value={scene.cells[col.id] ?? ''}
              onChange={(e) => updateCell(scene.id, col.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
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
              className="cell-input"
              value={scene.cells[col.id] ?? ''}
              onChange={(e) => updateCell(scene.id, col.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={2}
            />
          ) : (
            <input
              className="cell-input"
              type={col.type === 'number' ? 'number' : 'text'}
              value={scene.cells[col.id] ?? ''}
              onChange={(e) => updateCell(scene.id, col.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </td>
      ))}
      <td>
        <div className="cell-meta">
          {scene.characters.map((cid) => {
            const c = charMap[cid];
            if (!c) return null;
            return (
              <span
                key={cid}
                className="meta-pill"
                style={{ '--pill-color': c.color } as React.CSSProperties}
              >
                {c.name}
              </span>
            );
          })}
        </div>
      </td>
      <td>
        <div className="cell-meta">
          {scene.tags.map((tid) => {
            const t = tagMap[tid];
            if (!t) return null;
            return (
              <span
                key={tid}
                className="meta-pill"
                style={{ '--pill-color': t.color } as React.CSSProperties}
              >
                {t.name}
              </span>
            );
          })}
        </div>
      </td>
      <td className="row-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-icon"
          title="Duplicate"
          onClick={() => duplicateScene(scene.id)}
        >
          ⧉
        </button>
        <button
          className="btn-icon"
          title="Delete"
          onClick={() => {
            if (confirm(`Delete "${scene.title}"?`)) removeScene(scene.id);
          }}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function DragPreviewRow({ scene, columns }: { scene: Scene; columns: Column[] }) {
  return (
    <table className="plot-table drag-preview-table">
      <tbody>
        <tr className="selected">
          <td className="row-num drag-row-cell">
            <span className="row-drag-handle">⠿</span>
          </td>
          <td className="cell-title" style={{ minWidth: 160 }}>
            <div className="cell-input" style={{ fontWeight: 600 }}>
              {scene.title || 'Untitled scene'}
            </div>
          </td>
          {columns.slice(0, 3).map((col) => (
            <td key={col.id} style={{ width: col.width, minWidth: 80 }}>
              <div className="cell-input">{scene.cells[col.id] || '—'}</div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export function PlotGrid() {
  const columns = useNovelStore((s) => s.columns);
  const characters = useNovelStore((s) => s.characters);
  const tags = useNovelStore((s) => s.tags);
  const selectedSceneId = useNovelStore((s) => s.selectedSceneId);
  const getFilteredScenes = useNovelStore((s) => s.getFilteredScenes);
  const updateColumn = useNovelStore((s) => s.updateColumn);
  const removeColumn = useNovelStore((s) => s.removeColumn);
  const addColumn = useNovelStore((s) => s.addColumn);
  const addScene = useNovelStore((s) => s.addScene);
  const setSelectedSceneId = useNovelStore((s) => s.setSelectedSceneId);
  const reorderSyuzhet = useNovelStore((s) => s.reorderSyuzhet);

  const scenes = getFilteredScenes('grid');
  const [resizing, setResizing] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const resizeStart = useRef({ x: 0, width: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => scenes.map((s) => s.id), [scenes]);
  const activeScene = activeId ? scenes.find((s) => s.id === activeId) : null;

  const onResizeStart = useCallback(
    (e: React.MouseEvent, col: Column) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(col.id);
      resizeStart.current = { x: e.clientX, width: col.width };
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - resizeStart.current.x;
        updateColumn(col.id, {
          width: Math.max(60, resizeStart.current.width + delta),
        });
      };
      const onUp = () => {
        setResizing(null);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [updateColumn]
  );

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    // Grid is ordered by syuzhet (narrative / presentation order)
    reorderSyuzhet(String(active.id), String(over.id));
  };

  const charMap = Object.fromEntries(characters.map((c) => [c.id, c]));
  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));

  return (
    <div className="grid-wrapper">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <table className="plot-table">
          <thead>
            <tr>
              <th className="sticky-col row-num" style={{ width: 52 }}>
                <div className="th-inner" title="Drag rows to reorder syuzhet (narrative) order">
                  #
                </div>
              </th>
              <th className="sticky-col cell-title" style={{ left: 52, minWidth: 160 }}>
                <div className="th-inner">Scene</div>
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width, minWidth: col.width, position: 'relative' }}
                >
                  <div className="th-inner">
                    <input
                      value={col.name}
                      onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                      title="Edit column heading"
                    />
                    <div className="th-actions">
                      <select
                        className="col-type-select"
                        value={col.type}
                        onChange={(e) => {
                          const type = e.target.value as ColumnType;
                          updateColumn(col.id, {
                            type,
                            options:
                              type === 'select' ? col.options ?? ['Option 1'] : undefined,
                          });
                        }}
                        title="Column type"
                      >
                        {(Object.keys(TYPE_LABELS) as ColumnType[]).map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-icon"
                        title="Remove column"
                        onClick={() => {
                          if (confirm(`Remove column "${col.name}"?`)) removeColumn(col.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div
                    className={`col-resize ${resizing === col.id ? 'dragging' : ''}`}
                    onMouseDown={(e) => onResizeStart(e, col)}
                  />
                </th>
              ))}
              <th style={{ minWidth: 130 }}>
                <div className="th-inner">Characters</div>
              </th>
              <th style={{ minWidth: 110 }}>
                <div className="th-inner">Tags</div>
              </th>
              <th style={{ width: 80 }}>
                <div className="th-inner" />
              </th>
            </tr>
          </thead>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <tbody>
              {scenes.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 5}>
                    <div className="empty-state">
                      <h3>No scenes yet</h3>
                      <p>Add a scene to start building your plot grid.</p>
                      <button className="btn btn-primary" onClick={() => addScene()}>
                        + Add scene
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {scenes.map((scene, idx) => (
                <SortableRow
                  key={scene.id}
                  scene={scene}
                  idx={idx}
                  columns={columns}
                  charMap={charMap}
                  tagMap={tagMap}
                  selected={selectedSceneId === scene.id}
                  onSelect={() => setSelectedSceneId(scene.id)}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
        <DragOverlay dropAnimation={null}>
          {activeScene ? (
            <div className="grid-drag-overlay">
              <DragPreviewRow scene={activeScene} columns={columns} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <div className="add-row-bar">
        <button className="btn btn-ghost btn-sm" onClick={() => addScene()}>
          + Add scene
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => addColumn()}
          style={{ marginLeft: 8 }}
        >
          + Add column
        </button>
        {scenes.length > 0 && (
          <span className="grid-reorder-hint">
            Drag ⠿ to reorder rows (updates syuzhet / narrative order)
          </span>
        )}
      </div>
    </div>
  );
}
