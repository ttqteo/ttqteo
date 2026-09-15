import { addDaysToKey, type DateKey } from "@/lib/date-key";

/**
 * Google's own "new event" form, filled in with an all-day slot on `day`.
 * Creating the event over there keeps this side read-only: no OAuth, no
 * token, and the admin picks the calendar in Google's form.
 */
export function newGoogleEventUrl(day: DateKey, title?: string): string {
  const compact = (key: DateKey) => key.replace(/-/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    // All-day: the end is the day after, exclusive, as in iCalendar.
    dates: `${compact(day)}/${compact(addDaysToKey(day, 1))}`,
  });
  if (title?.trim()) params.set("text", title.trim());
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
