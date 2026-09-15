import { addDays, format } from "date-fns";

/**
 * A calendar day as `YYYY-MM-DD`, read in the browser's own time zone. Tasks
 * store their due date this way and the calendar groups by it, so "today" is
 * always the day on the admin's wall, never the server's (UTC on Vercel).
 */
export type DateKey = string;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date: Date): DateKey {
  return format(date, "yyyy-MM-dd");
}

/** Local midnight at the start of the day. */
export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Also rejects days that do not exist, like 2026-02-30. */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  return toDateKey(fromDateKey(value)) === value;
}

export function addDaysToKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), days));
}
