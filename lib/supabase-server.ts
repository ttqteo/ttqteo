import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  );
}

export const getSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});

// `cache()` dedupes within a server render: `getUser()` hits the Supabase auth
// server over the network, and several components used to each call it
// independently. It does not dedupe in a route handler; see isAdminUser.
export const getUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Whether this user is the admin, by ADMIN_EMAIL. Unset means nobody, never
 * everybody. Pure, so a route handler can check a user it already has.
 */
export function isAdminUser(user: { email?: string } | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail) && user?.email === adminEmail;
}

// Check if user is the admin (your email)
export const isAdmin = cache(async () => isAdminUser(await getUser()));
