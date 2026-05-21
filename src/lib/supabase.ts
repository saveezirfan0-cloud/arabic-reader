import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  typeof url === 'string' &&
  typeof anon === 'string' &&
  url.length > 0 &&
  anon.length > 0 &&
  !url.includes('your-project')

/**
 * Supabase client.
 *
 * If env vars are missing (e.g. first boot before .env.local is set up),
 * we create a stub client pointing at localhost so the app still mounts.
 * Use `isSupabaseConfigured` to gate any real queries.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  url || 'http://localhost:54321',
  anon || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
