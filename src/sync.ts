import { useEffect } from 'react';
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { useNovelStore } from './store';
import type { Column, Character, Scene, Tag } from './types';

/** The synced document — content only; view prefs stay local. */
interface NovelDoc {
  title: string;
  columns: Column[];
  scenes: Scene[];
  characters: Character[];
  tags: Tag[];
}

export type SyncStatus =
  | 'local' // signed out (or cloud not configured)
  | 'synced'
  | 'saving'
  | 'error'
  | 'conflict'; // another device/tab saved a newer version

interface SyncState {
  user: User | null;
  status: SyncStatus;
  error: string | null;
  signInWithEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  pullLatest: () => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 1500;

let novelId: string | null = null;
let lastSyncedAt: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;
let started = false;

function currentDoc(): NovelDoc {
  const s = useNovelStore.getState();
  return {
    title: s.title,
    columns: s.columns,
    scenes: s.scenes,
    characters: s.characters,
    tags: s.tags,
  };
}

function applyDoc(doc: NovelDoc) {
  applyingRemote = true;
  try {
    useNovelStore.setState({
      title: doc.title ?? 'Untitled Novel',
      columns: doc.columns ?? [],
      scenes: doc.scenes ?? [],
      characters: doc.characters ?? [],
      tags: doc.tags ?? [],
      selectedSceneId: null,
    });
  } finally {
    applyingRemote = false;
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  user: null,
  status: 'local',
  error: null,

  signInWithEmail: async (email) => {
    if (!supabase) return 'Cloud sync is not configured.';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? error.message : null;
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Local copy stays in localStorage; the store keeps working offline.
  },

  pullLatest: async () => {
    if (!supabase || !get().user) return;
    const { data, error } = await supabase
      .from('novels')
      .select('id, doc, updated_at')
      .eq('user_id', get().user!.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    if (data && data.length > 0) {
      novelId = data[0].id;
      lastSyncedAt = data[0].updated_at;
      applyDoc(data[0].doc as NovelDoc);
      set({ status: 'synced', error: null });
    }
  },
}));

async function save() {
  const { user } = useSyncStore.getState();
  if (!supabase || !user || !novelId || !lastSyncedAt) return;

  const doc = currentDoc();
  useSyncStore.setState({ status: 'saving' });

  // Compare-and-swap on updated_at: if another tab/device saved since we
  // last pulled, no row matches and we flag a conflict instead of clobbering.
  const { data, error } = await supabase
    .from('novels')
    .update({ title: doc.title, doc })
    .eq('id', novelId)
    .eq('updated_at', lastSyncedAt)
    .select('updated_at');

  if (error) {
    useSyncStore.setState({ status: 'error', error: error.message });
    return;
  }
  if (!data || data.length === 0) {
    useSyncStore.setState({ status: 'conflict', error: null });
    return;
  }
  lastSyncedAt = data[0].updated_at;
  useSyncStore.setState({ status: 'synced', error: null });
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void save();
  }, SAVE_DEBOUNCE_MS);
}

/** First sign-in uploads local work; later sign-ins load the cloud copy. */
async function bootstrap(user: User) {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('novels')
    .select('id, doc, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    useSyncStore.setState({ status: 'error', error: error.message });
    return;
  }

  if (data && data.length > 0) {
    novelId = data[0].id;
    lastSyncedAt = data[0].updated_at;
    applyDoc(data[0].doc as NovelDoc);
    useSyncStore.setState({ status: 'synced', error: null });
    return;
  }

  const doc = currentDoc();
  const inserted = await supabase
    .from('novels')
    .insert({ user_id: user.id, title: doc.title, doc })
    .select('id, updated_at')
    .single();

  if (inserted.error) {
    useSyncStore.setState({ status: 'error', error: inserted.error.message });
    return;
  }
  novelId = inserted.data.id;
  lastSyncedAt = inserted.data.updated_at;
  useSyncStore.setState({ status: 'synced', error: null });
}

function startSync() {
  if (started || !supabase) return;
  started = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    const prev = useSyncStore.getState().user;
    useSyncStore.setState({ user });
    if (user && user.id !== prev?.id) {
      // Deferred: supabase-js warns against awaiting client calls
      // inside the auth callback.
      setTimeout(() => void bootstrap(user), 0);
    } else if (!user && prev) {
      novelId = null;
      lastSyncedAt = null;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      useSyncStore.setState({ status: 'local', error: null });
    }
  });

  // Content fields are replaced immutably on every edit, so reference
  // checks are enough to skip view-only changes (filters, selection…).
  let seen = currentDoc();
  useNovelStore.subscribe((s) => {
    if (applyingRemote) return;
    const changed =
      s.title !== seen.title ||
      s.columns !== seen.columns ||
      s.scenes !== seen.scenes ||
      s.characters !== seen.characters ||
      s.tags !== seen.tags;
    if (!changed) return;
    seen = currentDoc();
    const { user, status } = useSyncStore.getState();
    if (user && status !== 'conflict') scheduleSave();
  });

  // Returning to the tab with no pending edits: pick up newer saves
  // from other devices.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const { user, status } = useSyncStore.getState();
    const id = novelId;
    if (!user || !id || saveTimer || status === 'saving' || status === 'conflict') return;
    void (async () => {
      const { data } = await supabase!
        .from('novels')
        .select('updated_at')
        .eq('id', id)
        .single();
      if (data && data.updated_at !== lastSyncedAt) {
        await useSyncStore.getState().pullLatest();
      }
    })();
  });
}

/** Call once from App. No-op when Supabase env vars are absent. */
export function useCloudSync() {
  useEffect(() => {
    startSync();
  }, []);
}
