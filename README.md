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
- **Cloud sync (optional)** — sign in with a magic link to back up to Supabase and work across devices
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

## Cloud sync setup (Supabase)

Without configuration the app is fully functional local-only. To enable accounts + cloud backup:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql) (creates the `novels` table with row-level security).
3. Under **Authentication → URL Configuration**, set the **Site URL** to your deployed URL (e.g. `https://fabulhet.vercel.app`) and add `http://localhost:5173` to **Redirect URLs** for local dev.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from **Project Settings → API**.
5. For production, set the same two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel → Project → Settings → Environment Variables, then redeploy.

How sync behaves:

- **Sign-in** is passwordless (email magic link). The anon key is safe to expose — row-level security means users can only ever read/write their own rows.
- **First sign-in uploads your local novel**; after that the cloud copy is the source of truth and loads on sign-in.
- **Saves are debounced** (~1.5 s after the last edit) and use compare-and-swap on `updated_at` — if another device saved in the meantime, the app flags a conflict and offers "Load latest from cloud" instead of overwriting.
- **localStorage keeps working** as the offline cache, and JSON export/import remains the escape hatch.

## Stack

- React 19 + TypeScript + Vite
- Zustand (state + localStorage persist)
- Supabase (optional auth + cloud storage)
- @dnd-kit (timeline drag-and-drop)

## Data model (brief)

- **Columns** — custom headings for the grid (`text` | `number` | `select` | `longtext`)
- **Scenes** — title, summary, cell values, character/tag ids, `fabulaOrder`, `syuzhetOrder`
- **Characters / Tags** — name + colour for filtering and pills

All project data is stored under the key `fabulhet-novel` in localStorage.
