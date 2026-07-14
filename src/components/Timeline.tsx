import { useMemo, useState } from 'react';
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
import type { Scene } from '../types';
import { HorizontalMultiTimeline } from './HorizontalMultiTimeline';

interface TimelineProps {
  mode: 'fabula' | 'syuzhet';
  compact?: boolean;
}

/** Presentational only — safe for DragOverlay (no useSortable). */
function SceneCardView({
  scene,
  mode,
  isSelected,
  isDragging,
  dragHandleProps,
  rootProps,
  rootRef,
}: {
  scene: Scene;
  mode: 'fabula' | 'syuzhet';
  isSelected?: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement> & { ref?: never };
  rootProps?: React.HTMLAttributes<HTMLDivElement>;
  rootRef?: (node: HTMLElement | null) => void;
}) {
  const characters = useNovelStore((s) => s.characters);
  const tags = useNovelStore((s) => s.tags);

  const charMap = Object.fromEntries(characters.map((c) => [c.id, c]));
  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));
  const order = mode === 'fabula' ? scene.fabulaOrder : scene.syuzhetOrder;
  const otherOrder = mode === 'fabula' ? scene.syuzhetOrder : scene.fabulaOrder;
  const otherLabel = mode === 'fabula' ? 'Syuzhet' : 'Fabula';
  const isFabula = mode === 'fabula';

  const { style: rootStyle, className: rootClassName, ...restRoot } = rootProps ?? {};

  return (
    <div
      ref={rootRef}
      style={
        {
          '--node-color': isFabula ? 'var(--fabula)' : 'var(--syuzhet)',
          '--badge-bg': isFabula ? 'var(--fabula-soft)' : 'var(--syuzhet-soft)',
          '--badge-color': isFabula ? 'var(--fabula)' : 'var(--syuzhet)',
          ...rootStyle,
        } as React.CSSProperties
      }
      className={`timeline-card ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${rootClassName ?? ''}`}
      {...restRoot}
    >
      <div className="drag-handle" title="Drag to reorder" {...dragHandleProps}>
        ⠿
      </div>
      <div className="order-badge">{order + 1}</div>
      <div className="card-body">
        <div className="card-title">{scene.title}</div>
        {scene.summary && <div className="card-summary">{scene.summary}</div>}
        <div className="card-meta">
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
          {scene.cells.pov && (
            <span
              className="meta-pill"
              style={{ '--pill-color': 'var(--text-muted)' } as React.CSSProperties}
            >
              POV: {scene.cells.pov}
            </span>
          )}
          {scene.cells.chapter && (
            <span
              className="meta-pill"
              style={{ '--pill-color': 'var(--text-muted)' } as React.CSSProperties}
            >
              Ch. {scene.cells.chapter}
            </span>
          )}
        </div>
      </div>
      <div className="card-side">
        <span className="cross-ref">
          {otherLabel} #{otherOrder + 1}
        </span>
        {scene.cells.act && <span>Act {scene.cells.act}</span>}
      </div>
    </div>
  );
}

function SortableSceneCard({
  scene,
  mode,
  isSelected,
  onSelect,
}: {
  scene: Scene;
  mode: 'fabula' | 'syuzhet';
  isSelected?: boolean;
  onSelect?: () => void;
}) {
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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <SceneCardView
      scene={scene}
      mode={mode}
      isSelected={isSelected}
      isDragging={isDragging}
      rootRef={setNodeRef}
      rootProps={{
        style,
        onClick: onSelect,
        ...attributes,
        ...listeners,
      }}
    />
  );
}

function VerticalTimeline({ mode, compact }: TimelineProps) {
  const getFilteredScenes = useNovelStore((s) => s.getFilteredScenes);
  const reorderFabula = useNovelStore((s) => s.reorderFabula);
  const reorderSyuzhet = useNovelStore((s) => s.reorderSyuzhet);
  const selectedSceneId = useNovelStore((s) => s.selectedSceneId);
  const setSelectedSceneId = useNovelStore((s) => s.setSelectedSceneId);
  const addScene = useNovelStore((s) => s.addScene);

  const scenes = getFilteredScenes(mode);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => scenes.map((s) => s.id), [scenes]);
  const activeScene = activeId ? scenes.find((s) => s.id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    if (mode === 'fabula') {
      reorderFabula(String(active.id), String(over.id));
    } else {
      reorderSyuzhet(String(active.id), String(over.id));
    }
  };

  const isFabula = mode === 'fabula';
  const title = isFabula ? 'Fabula' : 'Syuzhet';
  const subtitle = isFabula
    ? 'Chronological order — events as they occur in the story world'
    : 'Narrative order — events as presented to the reader';

  return (
    <div className={compact ? '' : 'timeline-view'}>
      {!compact && (
        <div className="timeline-header">
          <h2 style={{ color: isFabula ? 'var(--fabula)' : 'var(--syuzhet)' }}>{title}</h2>
          <span className="hint">{subtitle} · drag ⠿ to reorder</span>
        </div>
      )}

      {scenes.length === 0 ? (
        <div className="empty-state">
          <h3>No scenes match</h3>
          <p>Adjust filters or add a new scene.</p>
          <button className="btn btn-primary" onClick={() => addScene()}>
            + Add scene
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div
              className="timeline-track"
              style={
                {
                  '--track-color': isFabula ? 'var(--fabula)' : 'var(--syuzhet)',
                } as React.CSSProperties
              }
            >
              {scenes.map((scene) => (
                <SortableSceneCard
                  key={scene.id}
                  scene={scene}
                  mode={mode}
                  isSelected={selectedSceneId === scene.id}
                  onSelect={() => setSelectedSceneId(scene.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeScene ? (
              <div className="drag-overlay-card">
                <SceneCardView scene={activeScene} mode={mode} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!compact && scenes.length > 0 && (
        <div style={{ marginTop: '1rem', paddingLeft: '2rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => addScene()}>
            + Add scene
          </button>
        </div>
      )}
    </div>
  );
}

export function Timeline({ mode, compact }: TimelineProps) {
  const orientation = useNovelStore((s) => s.timelineOrientation);

  if (orientation === 'horizontal') {
    return <HorizontalMultiTimeline mode={mode} compact={compact} />;
  }
  return <VerticalTimeline mode={mode} compact={compact} />;
}

export function CompareView() {
  const orientation = useNovelStore((s) => s.timelineOrientation);

  return (
    <div className={`compare-view ${orientation === 'horizontal' ? 'compare-horizontal' : ''}`}>
      <div className="compare-pane">
        <h2>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--fabula)',
              display: 'inline-block',
            }}
          />
          Fabula
        </h2>
        <p className="pane-desc">
          {orientation === 'horizontal'
            ? 'Story-world chronology · multi-track · drag cards to reorder'
            : 'Story-world chronology · drag to reorder'}
        </p>
        <Timeline mode="fabula" compact />
      </div>
      <div className="compare-pane">
        <h2>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--syuzhet)',
              display: 'inline-block',
            }}
          />
          Syuzhet
        </h2>
        <p className="pane-desc">
          {orientation === 'horizontal'
            ? 'Narrative order · multi-track · drag cards to reorder'
            : 'Narrative presentation order · drag to reorder'}
        </p>
        <Timeline mode="syuzhet" compact />
      </div>
    </div>
  );
}
