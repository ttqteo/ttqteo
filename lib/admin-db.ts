/**
 * Pure helpers shared by the /api/admin routes behind the side panel. Kept
 * apart from lib/admin-api.ts, which pulls in next/headers and so cannot be
 * imported by a test.
 */

export type DbError = { code?: string; message?: string; details?: string; hint?: string };

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

// An instant with an explicit offset, as toISOString() and Postgres write it.
// Without an offset, a string would be read in whatever zone the server runs.
const ISO_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i;

/**
 * A timestamp from a request body as ISO; null when absent or unreadable.
 * Stricter than Date.parse, which also takes "1", "11/09/2026", strings with
 * no offset, and 2026-02-30 (rolled over to 2 March).
 */
export function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = ISO_INSTANT.exec(value);
  if (!match) return null;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
