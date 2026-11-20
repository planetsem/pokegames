import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The publishable key is meant to ship in the browser (Row Level Security
 * protects the data). Env vars override these for other deployments.
 */
const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://wpvxmevcoulpanigqrhd.supabase.co";
const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "sb_publishable_oIzFccf6HUHs5O3rUFyVqw_IMhXXAJD";

/** Null when the env vars are missing: the game then runs offline-only. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export const SAVES_TABLE = "saves";
