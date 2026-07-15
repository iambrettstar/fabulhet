import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set —
 * the app then runs local-only (localStorage) with no cloud features.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
