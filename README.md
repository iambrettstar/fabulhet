# Fabulhet

Interactive plot craft for novels — a customisable **plot grid** plus dual **fabula** / **syuzhet** timelines.

## Concepts

| Term | Meaning |
|------|---------|
| **Fabula** | Chronological order of events *in the story world* |
| **Syuzhet** | Order of events *as presented to the reader* |

Scenes live once; each has an independent position on both timelines. Drag either timeline to reshape structure without losing the other.

## Features

- **Plot grid** — tabular view with rows = scenes, columns = Act, Arc, Chapter, POV, Main Plot, Theme, Foreshadowing (fully renameable / addable / removable)
- **Fabula & Syuzhet timelines** — drag-and-drop reorder
- **Horizontal multi-track** — stacked character or tag lanes; shared scenes draw convergence branches
- **Vertical list** — classic single-column reorder view (toggle Layout)
- **Compare view** — both timelines side by side (or stacked when horizontal)
- **Characters & tags** — assign to scenes; filter grid and timelines; choose which lanes appear
- **Scene editor** — side panel for full scene details
- **Persistence** — auto-saves to browser `localStorage`
- **Import / export** — JSON backup of your project
- **Sample novel** — *The Archive Protocol* loaded by default so you can explore immediately

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build   # production build → dist/
npm run preview # serve the production build
```

## Stack

- React 19 + TypeScript + Vite
- Zustand (state + localStorage persist)
- @dnd-kit (timeline drag-and-drop)

## Data model (brief)

- **Columns** — custom headings for the grid (`text` | `number` | `select` | `longtext`)
- **Scenes** — title, summary, cell values, character/tag ids, `fabulaOrder`, `syuzhetOrder`
- **Characters / Tags** — name + colour for filtering and pills

All project data is stored under the key `fabulhet-novel` in localStorage.
