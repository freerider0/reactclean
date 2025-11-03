import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Creates and exports a Supabase client instance configured with
 * environment variables following official Supabase best practices.
 *
 * Configuration:
 * - autoRefreshToken: Automatically refresh the session before it expires
 * - persistSession: Persist session to localStorage
 * - detectSessionInUrl: Automatically detect OAuth callbacks
 * - storage: Uses localStorage for session persistence (default)
 * - storageKey: Custom key for storing auth data
 * - flowType: PKCE flow for better security
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'supabase.auth.token',
      flowType: 'pkce',
    },
  },
);
