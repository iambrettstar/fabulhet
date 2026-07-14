export type ColumnType = 'text' | 'number' | 'select' | 'longtext';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width: number;
  options?: string[]; // for select type
}

export interface Character {
  id: string;
  name: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Scene {
  id: string;
  title: string;
  cells: Record<string, string>; // columnId -> value
  characters: string[]; // character ids
  tags: string[]; // tag ids
  fabulaOrder: number; // chronological position in story-world
  syuzhetOrder: number; // narrative order as presented to reader
  summary: string;
}

export type ViewMode = 'grid' | 'fabula' | 'syuzhet' | 'compare';

/** Vertical list vs multi-track horizontal lanes */
export type TimelineOrientation = 'vertical' | 'horizontal';

/** What each horizontal track represents */
export type TrackBy = 'characters' | 'tags';

export interface NovelProject {
  id: string;
  title: string;
  columns: Column[];
  scenes: Scene[];
  characters: Character[];
  tags: Tag[];
}

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'act', name: 'Act', type: 'select', width: 90, options: ['I', 'II', 'III'] },
  { id: 'arc', name: 'Arc', type: 'text', width: 120 },
  { id: 'chapter', name: 'Chapter', type: 'number', width: 90 },
  { id: 'pov', name: 'POV', type: 'text', width: 110 },
  { id: 'main_plot', name: 'Main Plot', type: 'longtext', width: 220 },
  { id: 'theme', name: 'Theme', type: 'text', width: 140 },
  { id: 'foreshadowing', name: 'Foreshadowing', type: 'longtext', width: 180 },
];

export const CHARACTER_COLORS = [
  '#e07a5f', '#81b29a', '#f2cc8f', '#3d405b', '#e9c46a',
  '#2a9d8f', '#e76f51', '#264653', '#9b5de5', '#00bbf9',
  '#f15bb5', '#fee440', '#00f5d4', '#9b2226', '#ae2012',
];

export const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];
