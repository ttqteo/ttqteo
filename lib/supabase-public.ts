import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for reading public (published) content.
 *
 * Use this instead of `createSupabaseServerClient()` on public pages: that one
 * reads `cookies()`, which opts the whole route out of static rendering and
 * makes every navigation a fresh server render. Reads through this client stay
 * prerenderable / ISR-cacheable.
 */
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
