/**
 * Pure helpers shared by the /api/admin routes behind the side panel. Kept
 * apart from lib/admin-api.ts, which pulls in next/headers and so cannot be
 * imported by a test.
 */

export type DbError = { code?: string; message?: string };

/**
 * The table is not there: supabase/add_admin_side_panel.sql was never run.
 * PostgREST reports it as PGRST205 (not in its schema cache), Postgres as 42P01.
 */
export function isMissingTableError(error: DbError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table/i.test(error.message ?? "")
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** A timestamp from a request body as ISO; null when absent or unreadable. */
export function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
