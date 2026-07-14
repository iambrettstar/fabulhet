import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  Column,
  Character,
  Tag,
  Scene,
  ViewMode,
  ColumnType,
  TimelineOrientation,
  TrackBy,
} from './types';
import {
  DEFAULT_COLUMNS,
  CHARACTER_COLORS,
  TAG_COLORS,
} from './types';

interface Filters {
  characterIds: string[];
  tagIds: string[];
  search: string;
}

interface NovelStore {
  title: string;
  columns: Column[];
  scenes: Scene[];
  characters: Character[];
  tags: Tag[];
  viewMode: ViewMode;
  filters: Filters;
  selectedSceneId: string | null;
  timelineOrientation: TimelineOrientation;
  trackBy: TrackBy;
  /** Track ids to show in multi-track view; empty = all that appear in scenes */
  visibleTrackIds: string[];

  setTitle: (title: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setSelectedSceneId: (id: string | null) => void;
  setTimelineOrientation: (o: TimelineOrientation) => void;
  setTrackBy: (t: TrackBy) => void;
  setVisibleTrackIds: (ids: string[]) => void;
  toggleVisibleTrack: (id: string) => void;

  // Columns
  addColumn: (name?: string, type?: ColumnType) => void;
  updateColumn: (id: string, updates: Partial<Column>) => void;
  removeColumn: (id: string) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;

  // Scenes
  addScene: (afterId?: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  updateCell: (sceneId: string, columnId: string, value: string) => void;
  removeScene: (id: string) => void;
  reorderFabula: (activeId: string, overId: string) => void;
  reorderSyuzhet: (activeId: string, overId: string) => void;
  duplicateScene: (id: string) => void;

  // Characters
  addCharacter: (name?: string) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;

  // Tags
  addTag: (name?: string) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  removeTag: (id: string) => void;

  // Utils
  getFilteredScenes: (orderBy: 'fabula' | 'syuzhet' | 'grid') => Scene[];
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetToSample: () => void;
  clearAll: () => void;
}

function renumber(scenes: Scene[], field: 'fabulaOrder' | 'syuzhetOrder'): Scene[] {
  const sorted = [...scenes].sort((a, b) => a[field] - b[field]);
  return scenes.map((s) => {
    const idx = sorted.findIndex((x) => x.id === s.id);
    return { ...s, [field]: idx };
  });
}

function reorderByField(
  scenes: Scene[],
  activeId: string,
  overId: string,
  field: 'fabulaOrder' | 'syuzhetOrder'
): Scene[] {
  const sorted = [...scenes].sort((a, b) => a[field] - b[field]);
  const oldIndex = sorted.findIndex((s) => s.id === activeId);
  const newIndex = sorted.findIndex((s) => s.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return scenes;

  const [moved] = sorted.splice(oldIndex, 1);
  sorted.splice(newIndex, 0, moved);

  const orderMap = new Map(sorted.map((s, i) => [s.id, i]));
  return scenes.map((s) => ({
    ...s,
    [field]: orderMap.get(s.id) ?? s[field],
  }));
}

function createSampleData() {
  const chars: Character[] = [
    { id: 'char-elena', name: 'Elena Voss', color: CHARACTER_COLORS[0] },
    { id: 'char-marcus', name: 'Marcus Chen', color: CHARACTER_COLORS[1] },
    { id: 'char-iris', name: 'Iris Blackwood', color: CHARACTER_COLORS[2] },
    { id: 'char-theo', name: 'Theo', color: CHARACTER_COLORS[5] },
  ];

  const tags: Tag[] = [
    { id: 'tag-mystery', name: 'Mystery', color: TAG_COLORS[0] },
    { id: 'tag-romance', name: 'Romance', color: TAG_COLORS[2] },
    { id: 'tag-betrayal', name: 'Betrayal', color: TAG_COLORS[3] },
    { id: 'tag-revelation', name: 'Revelation', color: TAG_COLORS[6] },
    { id: 'tag-action', name: 'Action', color: TAG_COLORS[4] },
  ];

  const scenes: Scene[] = [
    {
      id: 'sc-1',
      title: 'The Letter Arrives',
      summary: 'Elena receives an anonymous letter about her father\'s death.',
      cells: {
        act: 'I',
        arc: 'Setup',
        chapter: '1',
        pov: 'Elena',
        main_plot: 'Inciting incident — the letter forces Elena to question everything.',
        theme: 'Truth vs comfort',
        foreshadowing: 'Wax seal matches the one on father\'s study desk.',
      },
      characters: ['char-elena'],
      tags: ['tag-mystery'],
      fabulaOrder: 2,
      syuzhetOrder: 0,
    },
    {
      id: 'sc-2',
      title: 'Childhood Memory: The Study',
      summary: 'Flashback — young Elena finds father burning papers.',
      cells: {
        act: 'I',
        arc: 'Setup',
        chapter: '2',
        pov: 'Elena',
        main_plot: 'Backstory — father\'s secret life hinted at.',
        theme: 'Hidden pasts',
        foreshadowing: 'The word "Archive" appears on a burned scrap.',
      },
      characters: ['char-elena'],
      tags: ['tag-mystery', 'tag-revelation'],
      fabulaOrder: 0,
      syuzhetOrder: 1,
    },
    {
      id: 'sc-3',
      title: 'Meeting Marcus',
      summary: 'Elena hires Marcus, a private investigator with his own agenda.',
      cells: {
        act: 'I',
        arc: 'Setup',
        chapter: '3',
        pov: 'Marcus',
        main_plot: 'Alliance formed. Marcus accepts the case.',
        theme: 'Trust',
        foreshadowing: 'Marcus glances at a photo of Iris before accepting.',
      },
      characters: ['char-elena', 'char-marcus'],
      tags: ['tag-mystery'],
      fabulaOrder: 3,
      syuzhetOrder: 2,
    },
    {
      id: 'sc-4',
      title: 'Iris at the Gallery',
      summary: 'Iris watches Elena from across a crowded art opening.',
      cells: {
        act: 'I',
        arc: 'Rising action',
        chapter: '4',
        pov: 'Iris',
        main_plot: 'Antagonist introduced. Iris knows about the letter.',
        theme: 'Surveillance / power',
        foreshadowing: 'Iris whispers "Archive Protocol" into a phone.',
      },
      characters: ['char-iris', 'char-elena'],
      tags: ['tag-mystery', 'tag-betrayal'],
      fabulaOrder: 4,
      syuzhetOrder: 3,
    },
    {
      id: 'sc-5',
      title: 'The First Clue',
      summary: 'Marcus finds a ledger entry linking father to Project Archive.',
      cells: {
        act: 'II',
        arc: 'Rising action',
        chapter: '5',
        pov: 'Marcus',
        main_plot: 'Investigation deepens. Project Archive named.',
        theme: 'Obsession',
        foreshadowing: 'A second name on the ledger: T. Renshaw (Theo).',
      },
      characters: ['char-marcus', 'char-elena'],
      tags: ['tag-mystery', 'tag-revelation'],
      fabulaOrder: 5,
      syuzhetOrder: 4,
    },
    {
      id: 'sc-6',
      title: 'Theo\'s Confession (Past)',
      summary: 'Years earlier: Theo warns father to leave the Archive.',
      cells: {
        act: 'II',
        arc: 'Backstory',
        chapter: '6',
        pov: 'Theo',
        main_plot: 'Deep past — the moral fracture that starts everything.',
        theme: 'Complicity',
        foreshadowing: 'Father refuses: "Someone has to hold the line."',
      },
      characters: ['char-theo'],
      tags: ['tag-revelation', 'tag-betrayal'],
      fabulaOrder: 1,
      syuzhetOrder: 5,
    },
    {
      id: 'sc-7',
      title: 'The Kiss on the Rooftop',
      summary: 'Elena and Marcus share a moment — then a gunshot nearby.',
      cells: {
        act: 'II',
        arc: 'Midpoint',
        chapter: '7',
        pov: 'Elena',
        main_plot: 'Emotional midpoint + danger escalates.',
        theme: 'Vulnerability',
        foreshadowing: 'The shooter wore Iris\'s signature perfume.',
      },
      characters: ['char-elena', 'char-marcus'],
      tags: ['tag-romance', 'tag-action'],
      fabulaOrder: 6,
      syuzhetOrder: 6,
    },
    {
      id: 'sc-8',
      title: 'Iris Reveals the Truth',
      summary: 'Iris captures Elena and explains Project Archive.',
      cells: {
        act: 'III',
        arc: 'Climax setup',
        chapter: '10',
        pov: 'Iris',
        main_plot: 'Major revelation — father built the Archive to erase people.',
        theme: 'Legacy of harm',
        foreshadowing: 'Iris offers Elena a seat at the table.',
      },
      characters: ['char-iris', 'char-elena'],
      tags: ['tag-betrayal', 'tag-revelation'],
      fabulaOrder: 8,
      syuzhetOrder: 7,
    },
    {
      id: 'sc-9',
      title: 'Marcus\'s Betrayal',
      summary: 'Elena discovers Marcus has been reporting to Iris all along.',
      cells: {
        act: 'III',
        arc: 'Climax',
        chapter: '11',
        pov: 'Elena',
        main_plot: 'Double-cross — trust shattered at the worst moment.',
        theme: 'Betrayal',
        foreshadowing: 'Earlier photo of Iris now fully contextualized.',
      },
      characters: ['char-elena', 'char-marcus', 'char-iris'],
      tags: ['tag-betrayal', 'tag-romance'],
      fabulaOrder: 9,
      syuzhetOrder: 8,
    },
    {
      id: 'sc-10',
      title: 'The Archive Burns',
      summary: 'Elena destroys the Archive — and chooses her own ending.',
      cells: {
        act: 'III',
        arc: 'Resolution',
        chapter: '12',
        pov: 'Elena',
        main_plot: 'Climax & resolution. Elena reclaims agency.',
        theme: 'Freedom / cost of truth',
        foreshadowing: '—',
      },
      characters: ['char-elena', 'char-theo'],
      tags: ['tag-action', 'tag-revelation'],
      fabulaOrder: 10,
      syuzhetOrder: 9,
    },
    {
      id: 'sc-11',
      title: 'Epilogue: Theo\'s Letter',
      summary: 'Theo left a letter for Elena — written before fabula event 1.',
      cells: {
        act: 'III',
        arc: 'Resolution',
        chapter: '13',
        pov: 'Elena',
        main_plot: 'Coda — the past speaks one last time.',
        theme: 'Closure',
        foreshadowing: '—',
      },
      characters: ['char-elena', 'char-theo'],
      tags: ['tag-revelation'],
      fabulaOrder: 7,
      syuzhetOrder: 10,
    },
  ];

  return {
    title: 'The Archive Protocol',
    columns: DEFAULT_COLUMNS.map((c) => ({ ...c })),
    scenes,
    characters: chars,
    tags,
  };
}

const sample = createSampleData();

export const useNovelStore = create<NovelStore>()(
  persist(
    (set, get) => ({
      title: sample.title,
      columns: sample.columns,
      scenes: sample.scenes,
      characters: sample.characters,
      tags: sample.tags,
      viewMode: 'grid',
      filters: { characterIds: [], tagIds: [], search: '' },
      selectedSceneId: null,
      timelineOrientation: 'horizontal',
      trackBy: 'characters',
      visibleTrackIds: [],

      setTitle: (title) => set({ title }),
      setViewMode: (viewMode) => set({ viewMode }),
      setFilters: (partial) =>
        set((s) => ({ filters: { ...s.filters, ...partial } })),
      setSelectedSceneId: (selectedSceneId) => set({ selectedSceneId }),
      setTimelineOrientation: (timelineOrientation) => set({ timelineOrientation }),
      setTrackBy: (trackBy) => set({ trackBy, visibleTrackIds: [] }),
      setVisibleTrackIds: (visibleTrackIds) => set({ visibleTrackIds }),
      toggleVisibleTrack: (id) =>
        set((s) => {
          const allIds =
            s.trackBy === 'characters'
              ? s.characters.map((c) => c.id)
              : s.tags.map((t) => t.id);
          // empty means "all" — first toggle starts from all and removes one
          const current =
            s.visibleTrackIds.length === 0 ? [...allIds] : [...s.visibleTrackIds];
          const idx = current.indexOf(id);
          if (idx >= 0) current.splice(idx, 1);
          else current.push(id);
          // if nothing left or everything selected, store empty (= all)
          if (current.length === 0 || current.length === allIds.length) {
            return { visibleTrackIds: [] };
          }
          return { visibleTrackIds: current };
        }),

      addColumn: (name = 'New Column', type = 'text') =>
        set((s) => ({
          columns: [
            ...s.columns,
            { id: uuid(), name, type, width: 140, options: type === 'select' ? [''] : undefined },
          ],
        })),

      updateColumn: (id, updates) =>
        set((s) => ({
          columns: s.columns.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      removeColumn: (id) =>
        set((s) => ({
          columns: s.columns.filter((c) => c.id !== id),
          scenes: s.scenes.map((sc) => {
            const cells = { ...sc.cells };
            delete cells[id];
            return { ...sc, cells };
          }),
        })),

      reorderColumns: (fromIndex, toIndex) =>
        set((s) => {
          const cols = [...s.columns];
          const [moved] = cols.splice(fromIndex, 1);
          cols.splice(toIndex, 0, moved);
          return { columns: cols };
        }),

      addScene: (afterId) =>
        set((s) => {
          let fabulaOrder = s.scenes.length;
          let syuzhetOrder = s.scenes.length;
          if (afterId) {
            const after = s.scenes.find((sc) => sc.id === afterId);
            if (after) {
              fabulaOrder = after.fabulaOrder + 0.5;
              syuzhetOrder = after.syuzhetOrder + 0.5;
            }
          }
          const newScene: Scene = {
            id: uuid(),
            title: 'New Scene',
            summary: '',
            cells: Object.fromEntries(s.columns.map((c) => [c.id, ''])),
            characters: [],
            tags: [],
            fabulaOrder,
            syuzhetOrder,
          };
          let scenes = [...s.scenes, newScene];
          scenes = renumber(scenes, 'fabulaOrder');
          scenes = renumber(scenes, 'syuzhetOrder');
          return { scenes, selectedSceneId: newScene.id };
        }),

      updateScene: (id, updates) =>
        set((s) => ({
          scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...updates } : sc)),
        })),

      updateCell: (sceneId, columnId, value) =>
        set((s) => ({
          scenes: s.scenes.map((sc) =>
            sc.id === sceneId
              ? { ...sc, cells: { ...sc.cells, [columnId]: value } }
              : sc
          ),
        })),

      removeScene: (id) =>
        set((s) => {
          let scenes = s.scenes.filter((sc) => sc.id !== id);
          scenes = renumber(scenes, 'fabulaOrder');
          scenes = renumber(scenes, 'syuzhetOrder');
          return {
            scenes,
            selectedSceneId: s.selectedSceneId === id ? null : s.selectedSceneId,
          };
        }),

      reorderFabula: (activeId, overId) =>
        set((s) => ({
          scenes: reorderByField(s.scenes, activeId, overId, 'fabulaOrder'),
        })),

      reorderSyuzhet: (activeId, overId) =>
        set((s) => ({
          scenes: reorderByField(s.scenes, activeId, overId, 'syuzhetOrder'),
        })),

      duplicateScene: (id) =>
        set((s) => {
          const src = s.scenes.find((sc) => sc.id === id);
          if (!src) return s;
          const copy: Scene = {
            ...src,
            id: uuid(),
            title: `${src.title} (copy)`,
            cells: { ...src.cells },
            characters: [...src.characters],
            tags: [...src.tags],
            fabulaOrder: src.fabulaOrder + 0.5,
            syuzhetOrder: src.syuzhetOrder + 0.5,
          };
          let scenes = [...s.scenes, copy];
          scenes = renumber(scenes, 'fabulaOrder');
          scenes = renumber(scenes, 'syuzhetOrder');
          return { scenes, selectedSceneId: copy.id };
        }),

      addCharacter: (name = 'New Character') =>
        set((s) => ({
          characters: [
            ...s.characters,
            {
              id: uuid(),
              name,
              color: CHARACTER_COLORS[s.characters.length % CHARACTER_COLORS.length],
            },
          ],
        })),

      updateCharacter: (id, updates) =>
        set((s) => ({
          characters: s.characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      removeCharacter: (id) =>
        set((s) => ({
          characters: s.characters.filter((c) => c.id !== id),
          scenes: s.scenes.map((sc) => ({
            ...sc,
            characters: sc.characters.filter((cid) => cid !== id),
          })),
          filters: {
            ...s.filters,
            characterIds: s.filters.characterIds.filter((cid) => cid !== id),
          },
        })),

      addTag: (name = 'New Tag') =>
        set((s) => ({
          tags: [
            ...s.tags,
            {
              id: uuid(),
              name,
              color: TAG_COLORS[s.tags.length % TAG_COLORS.length],
            },
          ],
        })),

      updateTag: (id, updates) =>
        set((s) => ({
          tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      removeTag: (id) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          scenes: s.scenes.map((sc) => ({
            ...sc,
            tags: sc.tags.filter((tid) => tid !== id),
          })),
          filters: {
            ...s.filters,
            tagIds: s.filters.tagIds.filter((tid) => tid !== id),
          },
        })),

      getFilteredScenes: (orderBy) => {
        const { scenes, filters } = get();
        let result = [...scenes];

        if (filters.characterIds.length > 0) {
          result = result.filter((sc) =>
            filters.characterIds.some((cid) => sc.characters.includes(cid))
          );
        }
        if (filters.tagIds.length > 0) {
          result = result.filter((sc) =>
            filters.tagIds.some((tid) => sc.tags.includes(tid))
          );
        }
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          result = result.filter(
            (sc) =>
              sc.title.toLowerCase().includes(q) ||
              sc.summary.toLowerCase().includes(q) ||
              Object.values(sc.cells).some((v) => v.toLowerCase().includes(q))
          );
        }

        if (orderBy === 'fabula') {
          result.sort((a, b) => a.fabulaOrder - b.fabulaOrder);
        } else if (orderBy === 'syuzhet') {
          result.sort((a, b) => a.syuzhetOrder - b.syuzhetOrder);
        } else {
          // grid defaults to syuzhet (reader order)
          result.sort((a, b) => a.syuzhetOrder - b.syuzhetOrder);
        }
        return result;
      },

      exportJSON: () => {
        const { title, columns, scenes, characters, tags } = get();
        return JSON.stringify({ title, columns, scenes, characters, tags }, null, 2);
      },

      importJSON: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data.scenes || !data.columns) return false;
          set({
            title: data.title ?? 'Imported Novel',
            columns: data.columns,
            scenes: data.scenes,
            characters: data.characters ?? [],
            tags: data.tags ?? [],
            selectedSceneId: null,
          });
          return true;
        } catch {
          return false;
        }
      },

      resetToSample: () => {
        const s = createSampleData();
        set({
          ...s,
          selectedSceneId: null,
          filters: { characterIds: [], tagIds: [], search: '' },
        });
      },

      clearAll: () =>
        set({
          title: 'Untitled Novel',
          columns: DEFAULT_COLUMNS.map((c) => ({ ...c })),
          scenes: [],
          characters: [],
          tags: [],
          selectedSceneId: null,
          filters: { characterIds: [], tagIds: [], search: '' },
        }),
    }),
    {
      name: 'fabulhet-novel',
      partialize: (s) => ({
        title: s.title,
        columns: s.columns,
        scenes: s.scenes,
        characters: s.characters,
        tags: s.tags,
        timelineOrientation: s.timelineOrientation,
        trackBy: s.trackBy,
        visibleTrackIds: s.visibleTrackIds,
      }),
    }
  )
);
