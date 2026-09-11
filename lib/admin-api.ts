import { isMissingTableError, type DbError } from "@/lib/admin-db";
import { getUser, isAdminUser } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * The same gate as app/api/posts/[id]/route.ts, with one auth round trip:
 * cache() does not dedupe inside a route handler, so isAdmin() after
 * getUser() would ask Supabase for the user twice. The Supabase client a
 * route uses afterwards carries the caller's token, so RLS on the admin_*
 * tables is a second wall behind this one rather than the only one.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

/** A Supabase error as a response. A missing table gets a code the panel shows its own hint for. */
export function dbError(error: DbError, route: string): NextResponse {
  if (isMissingTableError(error)) {
    console.error(`[${route}] table missing: run supabase/add_admin_side_panel.sql`);
    return NextResponse.json({ error: "missing_table", code: "missing_table" }, { status: 500 });
  }
  console.error(
    `[${route}] supabase error`,
    error.code ?? "",
    error.message,
    error.details ?? "",
    error.hint ?? "",
  );
  return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
}
