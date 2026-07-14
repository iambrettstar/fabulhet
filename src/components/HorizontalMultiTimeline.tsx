import { useMemo, useState, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNovelStore } from '../store';
import type { Scene, Character, Tag } from '../types';

const LANE_H = 96;
const LABEL_W = 132;
const SLOT_W = 148;
const PAD_X = 16;
const PAD_Y = 12;

export type TrackEntity = { id: string; name: string; color: string };

interface HorizontalMultiTimelineProps {
  mode: 'fabula' | 'syuzhet';
  compact?: boolean;
}

function sceneOnTrack(scene: Scene, trackId: string, trackBy: 'characters' | 'tags') {
  return trackBy === 'characters'
    ? scene.characters.includes(trackId)
    : scene.tags.includes(trackId);
}

/** Resolve scene id from sortable id or lane-drag id. */
function sceneIdFromDndId(id: UniqueIdentifier, data?: Record<string, unknown> | null): string {
  if (data && typeof data.sceneId === 'string') return data.sceneId;
  const s = String(id);
  if (s.startsWith('lane:')) {
    // lane:{trackId}:{sceneId} — sceneId may contain colons (uuid uses them rarely; our ids don't)
    const parts = s.split(':');
    return parts.slice(2).join(':');
  }
  if (s.startsWith('drop:')) {
    return s.slice('drop:'.length);
  }
  return s;
}

/** Presentational node — safe for DragOverlay. */
function HNodeView({
  scene,
  mode,
  trackColor,
  isSelected,
  isDragging,
  isConvergence,
  isOver,
  className = '',
}: {
  scene: Scene;
  mode: 'fabula' | 'syuzhet';
  trackColor?: string;
  isSelected?: boolean;
  isDragging?: boolean;
  isConvergence?: boolean;
  isOver?: boolean;
  className?: string;
}) {
  const order = mode === 'fabula' ? scene.fabulaOrder : scene.syuzhetOrder;
  return (
    <div
      className={`h-node ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isConvergence ? 'convergence' : ''} ${isOver ? 'drop-over' : ''} ${className}`}
      title={scene.summary || scene.title}
    >
      <div
        className="h-node-accent"
        style={{ background: trackColor ?? (mode === 'fabula' ? 'var(--fabula)' : 'var(--syuzhet)') }}
      />
      <div className="h-node-order">{order + 1}</div>
      <div className="h-node-title">{scene.title}</div>
      {isConvergence && <div className="h-node-conv-badge">∩</div>}
    </div>
  );
}

function SortableOrderItem({
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
  } = useSortable({
    id: scene.id,
    data: { sceneId: scene.id, type: 'order' },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: SLOT_W,
    flexShrink: 0,
    opacity: isDragging ? 0.35 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
    boxSizing: 'border-box',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-slot h-slot-sortable"
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <HNodeView
        scene={scene}
        mode={mode}
        isSelected={isSelected}
        isDragging={isDragging}
      />
    </div>
  );
}

/** Full-height drop target for a scene column (receives lane-card drops). */
function ColumnDroppable({
  sceneId,
  col,
  height,
}: {
  sceneId: string;
  col: number;
  height: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:${sceneId}`,
    data: { sceneId, type: 'column' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-column-drop ${isOver ? 'is-over' : ''}`}
      style={{
        left: PAD_X + col * SLOT_W,
        width: SLOT_W,
        height,
      }}
    />
  );
}

function TrackSceneNode({
  scene,
  track,
  mode,
  col,
  trackBy,
  isSelected,
  onSelect,
}: {
  scene: Scene;
  track: TrackEntity;
  mode: 'fabula' | 'syuzhet';
  col: number;
  trackBy: 'characters' | 'tags';
  isSelected: boolean;
  onSelect: () => void;
}) {
  const dragId = `lane:${track.id}:${scene.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { sceneId: scene.id, type: 'lane', trackId: track.id },
  });

  const participants =
    trackBy === 'characters' ? scene.characters.length : scene.tags.length;
  const isConv = participants > 1;

  return (
    <div
      ref={setNodeRef}
      className="h-slot"
      style={{ left: PAD_X + col * SLOT_W, width: SLOT_W }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Don't treat drag as click; simple click still selects
        if (!isDragging) onSelect();
        e.stopPropagation();
      }}
    >
      <HNodeView
        scene={scene}
        mode={mode}
        trackColor={track.color}
        isSelected={isSelected}
        isDragging={isDragging}
        isConvergence={isConv}
        className="static"
      />
    </div>
  );
}

function ConvergenceOverlay({
  scenes,
  tracks,
  trackBy,
  mode,
  width,
  height,
}: {
  scenes: Scene[];
  tracks: TrackEntity[];
  trackBy: 'characters' | 'tags';
  mode: 'fabula' | 'syuzhet';
  width: number;
  height: number;
}) {
  const accent = mode === 'fabula' ? 'var(--fabula)' : 'var(--syuzhet)';

  const links = useMemo(() => {
    const result: {
      sceneId: string;
      col: number;
      topTrack: number;
      bottomTrack: number;
      colors: string[];
      title: string;
    }[] = [];

    scenes.forEach((scene, col) => {
      const trackIndices: number[] = [];
      tracks.forEach((t, ti) => {
        if (sceneOnTrack(scene, t.id, trackBy)) trackIndices.push(ti);
      });
      if (trackIndices.length < 2) return;
      const top = Math.min(...trackIndices);
      const bottom = Math.max(...trackIndices);
      result.push({
        sceneId: scene.id,
        col,
        topTrack: top,
        bottomTrack: bottom,
        colors: trackIndices.map((i) => tracks[i].color),
        title: scene.title,
      });
    });
    return result;
  }, [scenes, tracks, trackBy]);

  if (links.length === 0) return null;

  return (
    <svg
      className="h-convergence-svg"
      width={width}
      height={height}
      style={{ left: LABEL_W }}
    >
      <defs>
        {links.map((link) => (
          <linearGradient
            key={`grad-${link.sceneId}`}
            id={`conv-grad-${mode}-${link.sceneId}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={link.colors[0]} stopOpacity="0.55" />
            <stop
              offset="100%"
              stopColor={link.colors[link.colors.length - 1]}
              stopOpacity="0.55"
            />
          </linearGradient>
        ))}
      </defs>
      {links.map((link) => {
        const cx = PAD_X + link.col * SLOT_W + SLOT_W / 2;
        const y1 = PAD_Y + link.topTrack * LANE_H + LANE_H / 2;
        const y2 = PAD_Y + link.bottomTrack * LANE_H + LANE_H / 2;
        const bandW = 10;

        const midYs: number[] = [];
        for (let ti = link.topTrack; ti <= link.bottomTrack; ti++) {
          if (sceneOnTrack(scenes[link.col], tracks[ti].id, trackBy)) {
            midYs.push(PAD_Y + ti * LANE_H + LANE_H / 2);
          }
        }

        return (
          <g key={link.sceneId} className="h-conv-group">
            <rect
              x={cx - bandW / 2}
              y={y1}
              width={bandW}
              height={Math.max(0, y2 - y1)}
              rx={bandW / 2}
              fill={`url(#conv-grad-${mode}-${link.sceneId})`}
              opacity={0.35}
            />
            <line
              x1={cx}
              y1={y1}
              x2={cx}
              y2={y2}
              stroke={accent}
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            {midYs.map((my, i) => (
              <g key={i}>
                <line
                  x1={cx - 14}
                  y1={my}
                  x2={cx + 14}
                  y2={my}
                  stroke={link.colors[i] ?? accent}
                  strokeWidth={2}
                  opacity={0.85}
                />
                <circle
                  cx={cx}
                  cy={my}
                  r={5}
                  fill={link.colors[i] ?? accent}
                  stroke="var(--bg-elevated)"
                  strokeWidth={2}
                />
              </g>
            ))}
            <title>{`Convergence: ${link.title}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function TrackLane({
  track,
  scenes,
  trackBy,
  mode,
  selectedSceneId,
  onSelect,
}: {
  track: TrackEntity;
  scenes: Scene[];
  trackBy: 'characters' | 'tags';
  mode: 'fabula' | 'syuzhet';
  selectedSceneId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="h-lane" style={{ height: LANE_H }}>
      <div className="h-lane-label" style={{ borderColor: track.color }}>
        <span className="chip-dot" style={{ background: track.color }} />
        <span className="h-lane-name" title={track.name}>
          {track.name}
        </span>
      </div>
      <div className="h-lane-rail" style={{ width: scenes.length * SLOT_W + PAD_X * 2 }}>
        <div
          className="h-lane-line"
          style={{ background: `linear-gradient(90deg, ${track.color}55, ${track.color}22)` }}
        />
        {scenes.map((scene, col) => {
          if (!sceneOnTrack(scene, track.id, trackBy)) {
            return (
              <div
                key={scene.id}
                className="h-slot h-slot-empty"
                style={{ left: PAD_X + col * SLOT_W, width: SLOT_W }}
              />
            );
          }
          return (
            <TrackSceneNode
              key={scene.id}
              scene={scene}
              track={track}
              mode={mode}
              col={col}
              trackBy={trackBy}
              isSelected={selectedSceneId === scene.id}
              onSelect={() => onSelect(scene.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function HorizontalMultiTimeline({ mode, compact }: HorizontalMultiTimelineProps) {
  const getFilteredScenes = useNovelStore((s) => s.getFilteredScenes);
  const characters = useNovelStore((s) => s.characters);
  const tags = useNovelStore((s) => s.tags);
  const trackBy = useNovelStore((s) => s.trackBy);
  const visibleTrackIds = useNovelStore((s) => s.visibleTrackIds);
  const selectedSceneId = useNovelStore((s) => s.selectedSceneId);
  const setSelectedSceneId = useNovelStore((s) => s.setSelectedSceneId);
  const addScene = useNovelStore((s) => s.addScene);
  const reorderFabula = useNovelStore((s) => s.reorderFabula);
  const reorderSyuzhet = useNovelStore((s) => s.reorderSyuzhet);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const scenes = getFilteredScenes(mode);

  const allTracks: TrackEntity[] = useMemo(() => {
    const pool: TrackEntity[] =
      trackBy === 'characters'
        ? characters.map((c: Character) => ({ id: c.id, name: c.name, color: c.color }))
        : tags.map((t: Tag) => ({ id: t.id, name: t.name, color: t.color }));

    const chosen =
      visibleTrackIds.length > 0
        ? pool.filter((t) => visibleTrackIds.includes(t.id))
        : pool;

    return chosen.filter((t) => scenes.some((sc) => sceneOnTrack(sc, t.id, trackBy)));
  }, [trackBy, characters, tags, visibleTrackIds, scenes]);

  const boardWidth = scenes.length * SLOT_W + PAD_X * 2;
  const boardHeight = allTracks.length * LANE_H + PAD_Y * 2;
  const ids = useMemo(() => scenes.map((s) => s.id), [scenes]);
  const activeScene = activeSceneId ? scenes.find((s) => s.id === activeSceneId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (e: DragStartEvent) => {
    setActiveSceneId(sceneIdFromDndId(e.active.id, e.active.data.current as Record<string, unknown>));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveSceneId(null);
    const { active, over } = e;
    if (!over) return;

    const fromId = sceneIdFromDndId(active.id, active.data.current as Record<string, unknown>);
    const toId = sceneIdFromDndId(over.id, over.data.current as Record<string, unknown>);
    if (!fromId || !toId || fromId === toId) return;

    if (mode === 'fabula') reorderFabula(fromId, toId);
    else reorderSyuzhet(fromId, toId);
  };

  const isFabula = mode === 'fabula';
  const title = isFabula ? 'Fabula' : 'Syuzhet';
  const subtitle = isFabula
    ? 'Chronological order · multi-track · drag any card to reorder'
    : 'Narrative order · multi-track · drag any card to reorder';

  const convCount = useMemo(() => {
    let n = 0;
    for (const sc of scenes) {
      const hits = allTracks.filter((t) => sceneOnTrack(sc, t.id, trackBy)).length;
      if (hits >= 2) n++;
    }
    return n;
  }, [scenes, allTracks, trackBy]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.shiftKey && scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  if (scenes.length === 0) {
    return (
      <div className={compact ? '' : 'timeline-view'}>
        {!compact && (
          <div className="timeline-header">
            <h2 style={{ color: isFabula ? 'var(--fabula)' : 'var(--syuzhet)' }}>{title}</h2>
            <span className="hint">{subtitle}</span>
          </div>
        )}
        <div className="empty-state">
          <h3>No scenes match</h3>
          <p>Adjust filters or add a new scene.</p>
          <button className="btn btn-primary" onClick={() => addScene()}>
            + Add scene
          </button>
        </div>
      </div>
    );
  }

  if (allTracks.length === 0) {
    return (
      <div className={compact ? '' : 'timeline-view'}>
        {!compact && (
          <div className="timeline-header">
            <h2 style={{ color: isFabula ? 'var(--fabula)' : 'var(--syuzhet)' }}>{title}</h2>
          </div>
        )}
        <div className="empty-state">
          <h3>No tracks to show</h3>
          <p>
            Add {trackBy === 'characters' ? 'characters' : 'tags'} and assign them to scenes, or
            clear track filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? 'h-timeline compact' : 'timeline-view h-timeline'}>
      {!compact && (
        <div className="timeline-header">
          <h2 style={{ color: isFabula ? 'var(--fabula)' : 'var(--syuzhet)' }}>{title}</h2>
          <span className="hint">{subtitle}</span>
          {convCount > 0 && (
            <span className="conv-stat" title="Scenes shared by 2+ tracks">
              {convCount} convergence{convCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      {compact && convCount > 0 && (
        <p className="pane-desc" style={{ marginBottom: '0.75rem' }}>
          {convCount} convergence{convCount !== 1 ? 's' : ''} · drag cards to reorder
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveSceneId(null)}
      >
        <div className="h-board-scroll" ref={scrollRef} onWheel={onWheel}>
          <div className="h-board" style={{ minWidth: LABEL_W + boardWidth }}>
            {/* Order row — primary sortable list */}
            <div className="h-ruler-wrap">
              <div className="h-lane-label h-ruler-label">Order</div>
              <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                <div
                  className="h-ruler-slots"
                  style={{ width: boardWidth, paddingLeft: PAD_X, paddingRight: PAD_X }}
                >
                  {scenes.map((scene) => (
                    <SortableOrderItem
                      key={scene.id}
                      scene={scene}
                      mode={mode}
                      isSelected={selectedSceneId === scene.id}
                      onSelect={() => setSelectedSceneId(scene.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>

            <div className="h-tracks-block" style={{ position: 'relative', height: boardHeight }}>
              {/* Column drop targets behind lanes (for lane-card drops) */}
              <div
                className="h-column-drops"
                style={{
                  left: LABEL_W,
                  width: boardWidth,
                  height: boardHeight,
                }}
              >
                {scenes.map((scene, col) => (
                  <ColumnDroppable
                    key={scene.id}
                    sceneId={scene.id}
                    col={col}
                    height={boardHeight}
                  />
                ))}
              </div>

              <ConvergenceOverlay
                scenes={scenes}
                tracks={allTracks}
                trackBy={trackBy}
                mode={mode}
                width={boardWidth}
                height={boardHeight}
              />
              <div className="h-lanes" style={{ paddingTop: PAD_Y, paddingBottom: PAD_Y }}>
                {allTracks.map((track) => (
                  <TrackLane
                    key={track.id}
                    track={track}
                    scenes={scenes}
                    trackBy={trackBy}
                    mode={mode}
                    selectedSceneId={selectedSceneId}
                    onSelect={setSelectedSceneId}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeScene ? (
            <div className="drag-overlay-card">
              <HNodeView scene={activeScene} mode={mode} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!compact && (
        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => addScene()}>
            + Add scene
          </button>
          <span className="hint" style={{ marginLeft: '0.75rem' }}>
            Drag cards on the Order row or any lane · ∩ = shared / convergence
          </span>
        </div>
      )}
    </div>
  );
}
