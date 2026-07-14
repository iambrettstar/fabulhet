import { useNovelStore } from '../store';
import type { TimelineOrientation, TrackBy } from '../types';

export function FilterBar() {
  const characters = useNovelStore((s) => s.characters);
  const tags = useNovelStore((s) => s.tags);
  const filters = useNovelStore((s) => s.filters);
  const setFilters = useNovelStore((s) => s.setFilters);
  const getFilteredScenes = useNovelStore((s) => s.getFilteredScenes);
  const viewMode = useNovelStore((s) => s.viewMode);
  const addScene = useNovelStore((s) => s.addScene);
  const timelineOrientation = useNovelStore((s) => s.timelineOrientation);
  const setTimelineOrientation = useNovelStore((s) => s.setTimelineOrientation);
  const trackBy = useNovelStore((s) => s.trackBy);
  const setTrackBy = useNovelStore((s) => s.setTrackBy);
  const visibleTrackIds = useNovelStore((s) => s.visibleTrackIds);
  const toggleVisibleTrack = useNovelStore((s) => s.toggleVisibleTrack);
  const setVisibleTrackIds = useNovelStore((s) => s.setVisibleTrackIds);

  const isTimelineView =
    viewMode === 'fabula' || viewMode === 'syuzhet' || viewMode === 'compare';
  const isHorizontal = timelineOrientation === 'horizontal';

  const orderBy =
    viewMode === 'fabula' ? 'fabula' : viewMode === 'syuzhet' ? 'syuzhet' : 'grid';
  const count = getFilteredScenes(orderBy).length;
  const total = useNovelStore((s) => s.scenes.length);

  const toggleCharacter = (id: string) => {
    const set = new Set(filters.characterIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setFilters({ characterIds: [...set] });
  };

  const toggleTag = (id: string) => {
    const set = new Set(filters.tagIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setFilters({ tagIds: [...set] });
  };

  const hasFilters =
    filters.characterIds.length > 0 ||
    filters.tagIds.length > 0 ||
    filters.search.trim() !== '';

  const trackPool = trackBy === 'characters' ? characters : tags;
  const isTrackVisible = (id: string) =>
    visibleTrackIds.length === 0 || visibleTrackIds.includes(id);

  return (
    <div className="toolbar-stack">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search scenes…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />

        {isTimelineView && (
          <div className="filter-group layout-toggles">
            <span className="filter-label">Layout</span>
            <div className="seg-control" role="group" aria-label="Timeline layout">
              {(
                [
                  { id: 'horizontal' as TimelineOrientation, label: '↔ Horizontal' },
                  { id: 'vertical' as TimelineOrientation, label: '↕ Vertical' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`seg-btn ${timelineOrientation === opt.id ? 'active' : ''}`}
                  onClick={() => setTimelineOrientation(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTimelineView && isHorizontal && (
          <div className="filter-group layout-toggles">
            <span className="filter-label">Tracks by</span>
            <div className="seg-control" role="group" aria-label="Track by">
              {(
                [
                  { id: 'characters' as TrackBy, label: 'Characters' },
                  { id: 'tags' as TrackBy, label: 'Tags' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`seg-btn ${trackBy === opt.id ? 'active' : ''}`}
                  onClick={() => setTrackBy(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {characters.length > 0 && (
          <div className="filter-group">
            <span className="filter-label">Characters</span>
            {characters.map((c) => (
              <button
                key={c.id}
                className={`chip ${filters.characterIds.includes(c.id) ? 'active' : ''}`}
                style={{ color: c.color }}
                onClick={() => toggleCharacter(c.id)}
                title={`Filter scenes by ${c.name}`}
              >
                <span className="chip-dot" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="filter-group">
            <span className="filter-label">Tags</span>
            {tags.map((t) => (
              <button
                key={t.id}
                className={`chip ${filters.tagIds.includes(t.id) ? 'active' : ''}`}
                style={{ color: t.color }}
                onClick={() => toggleTag(t.id)}
                title={`Filter scenes by ${t.name}`}
              >
                <span className="chip-dot" style={{ background: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
        )}

        {hasFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFilters({ characterIds: [], tagIds: [], search: '' })}
          >
            Clear filters
          </button>
        )}

        <div className="toolbar-spacer" />

        <span className="scene-count">
          {hasFilters ? `${count} of ${total}` : total} scene{total !== 1 ? 's' : ''}
        </span>

        <button className="btn btn-primary btn-sm" onClick={() => addScene()}>
          + Scene
        </button>
      </div>

      {/* Second row: which tracks appear on the multi-track board */}
      {isTimelineView && isHorizontal && trackPool.length > 0 && (
        <div className="toolbar toolbar-tracks">
          <div className="filter-group">
            <span className="filter-label">Lanes on board</span>
            {trackPool.map((t) => {
              const on = isTrackVisible(t.id);
              return (
                <button
                  key={t.id}
                  className={`chip track-chip ${on ? 'active' : 'track-off'}`}
                  style={{ color: t.color }}
                  onClick={() => toggleVisibleTrack(t.id)}
                  title={on ? `Hide ${t.name} lane` : `Show ${t.name} lane`}
                >
                  <span className="chip-dot" style={{ background: t.color }} />
                  {t.name}
                </button>
              );
            })}
            {visibleTrackIds.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setVisibleTrackIds([])}
              >
                Show all lanes
              </button>
            )}
          </div>
          <span className="scene-count track-hint">
            Shared scenes draw a convergence branch (∩) between lanes
          </span>
        </div>
      )}
    </div>
  );
}
