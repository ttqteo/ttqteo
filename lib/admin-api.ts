import { isMissingTableError, type DbError } from "@/lib/admin-db";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * The same gate as app/api/posts/[id]/route.ts. The Supabase client a route
 * uses afterwards carries the caller's token, so RLS on the admin_* tables is
 * a second wall behind this one rather than the only one.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!(await getUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin())) {
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
    return NextResponse.json({ error: "missing_table", code: "missing_table" }, { status: 500 });
  }
  console.error(`[${route}] supabase error:`, error.message);
  return NextResponse.json({ error: error.message ?? "Database error" }, { status: 500 });
}
