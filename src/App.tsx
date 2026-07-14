import { useState, useEffect, useRef } from 'react';
import { useNovelStore } from './store';
import type { ViewMode } from './types';
import { PlotGrid } from './components/PlotGrid';
import { Timeline, CompareView } from './components/Timeline';
import { FilterBar } from './components/FilterBar';
import { SceneEditor } from './components/SceneEditor';
import {
  CharactersModal,
  TagsModal,
  ColumnsModal,
  DataMenu,
} from './components/ManageModals';

const VIEWS: { id: ViewMode; label: string; dot: string }[] = [
  { id: 'grid', label: 'Plot Grid', dot: 'grid' },
  { id: 'fabula', label: 'Fabula', dot: 'fabula' },
  { id: 'syuzhet', label: 'Syuzhet', dot: 'syuzhet' },
  { id: 'compare', label: 'Compare', dot: 'compare' },
];

export default function App() {
  const title = useNovelStore((s) => s.title);
  const setTitle = useNovelStore((s) => s.setTitle);
  const viewMode = useNovelStore((s) => s.viewMode);
  const setViewMode = useNovelStore((s) => s.setViewMode);

  const [charsOpen, setCharsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const manageRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (manageRef.current && !manageRef.current.contains(e.target as Node)) {
        setManageOpen(false);
      }
      if (dataRef.current && !dataRef.current.contains(e.target as Node)) {
        setDataOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    document.title = title ? `${title} · Fabulhet` : 'Fabulhet';
  }, [title]);

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-mark">Fabulhet</span>
          <span className="logo-sub">plot craft</span>
        </div>

        <input
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Novel title"
          aria-label="Novel title"
        />

        <nav className="nav-tabs" aria-label="Views">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`nav-tab ${viewMode === v.id ? 'active' : ''}`}
              onClick={() => setViewMode(v.id)}
            >
              <span className={`dot ${v.dot}`} />
              <span className="label">{v.label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <div className="menu-wrap" ref={manageRef}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setManageOpen((o) => !o)}
            >
              Manage ▾
            </button>
            {manageOpen && (
              <div className="menu-dropdown">
                <button
                  className="menu-item"
                  onClick={() => {
                    setColsOpen(true);
                    setManageOpen(false);
                  }}
                >
                  Columns
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setCharsOpen(true);
                    setManageOpen(false);
                  }}
                >
                  Characters
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setTagsOpen(true);
                    setManageOpen(false);
                  }}
                >
                  Tags
                </button>
              </div>
            )}
          </div>

          <div className="menu-wrap" ref={dataRef}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setDataOpen((o) => !o)}
            >
              Data ▾
            </button>
            <DataMenu open={dataOpen} onClose={() => setDataOpen(false)} />
          </div>
        </div>
      </header>

      <FilterBar />

      <div className="main">
        <div className="main-content">
          {viewMode === 'grid' && <PlotGrid />}
          {viewMode === 'fabula' && <Timeline mode="fabula" />}
          {viewMode === 'syuzhet' && <Timeline mode="syuzhet" />}
          {viewMode === 'compare' && <CompareView />}
        </div>
        <SceneEditor />
      </div>

      <CharactersModal open={charsOpen} onClose={() => setCharsOpen(false)} />
      <TagsModal open={tagsOpen} onClose={() => setTagsOpen(false)} />
      <ColumnsModal open={colsOpen} onClose={() => setColsOpen(false)} />
    </div>
  );
}
