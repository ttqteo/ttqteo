import { format } from "date-fns";
import { addDaysToKey, fromDateKey, toDateKey, type DateKey } from "@/lib/date-key";

/**
 * One occurrence of a Google Calendar event, as the calendar route hands it to
 * the browser. Recurring events arrive already expanded, one entry per
 * occurrence. No ical.js in here: this file is imported by the client.
 */
export type CalendarEvent = {
  id: string;
  calendar: string;
  color: string;
  title: string;
  location: string | null;
  description: string | null;
  allDay: boolean;
  /** All-day: the first day, `YYYY-MM-DD`. Timed: an ISO instant. */
  start: string;
  /** All-day: the day after the last one (exclusive). Timed: an ISO instant. */
  end: string;
};

export type CalendarPayload = {
  /** False when ADMIN_CALENDAR_FEEDS is missing or invalid; `error` says why. */
  configured: boolean;
  events: CalendarEvent[];
  /** Names of the calendars that could not be loaded this time. */
  failed: string[];
  error?: string;
};

/** Whether the event touches this local day at all. */
export function occursOn(event: CalendarEvent, day: DateKey): boolean {
  if (event.allDay) return event.start <= day && day < event.end;
  const dayStart = fromDateKey(day).getTime();
  const dayEnd = fromDateKey(addDaysToKey(day, 1)).getTime();
  const startMs = Date.parse(event.start);
  // A zero-length event exactly at midnight has end === start === dayStart,
  // which `end > dayStart` alone would miss.
  return startMs < dayEnd && (Date.parse(event.end) > dayStart || startMs === dayStart);
}

/** The day's agenda: all-day events first by title, then timed ones by start. */
export function eventsOn(events: CalendarEvent[], day: DateKey): CalendarEvent[] {
  return events
    .filter((event) => occursOn(event, day))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      const byStart = a.allDay ? 0 : Date.parse(a.start) - Date.parse(b.start);
      return byStart || a.title.localeCompare(b.title, "vi");
    });
}

/** Every local day in [from, to) with at least one event: the dots on the month grid. */
export function daysWithEvents(
  events: CalendarEvent[],
  from: DateKey,
  to: DateKey,
): Set<DateKey> {
  const days = new Set<DateKey>();
  for (let day = from; day < to; day = addDaysToKey(day, 1)) {
    if (events.some((event) => occursOn(event, day))) days.add(day);
  }
  return days;
}

/** "09:00–17:30", or "Cả ngày". */
export function eventTimeLabel(event: CalendarEvent): string {
  if (event.allDay) return "Cả ngày";
  const start = format(new Date(event.start), "HH:mm");
  const end = format(new Date(event.end), "HH:mm");
  return `${start}–${end}`;
}

/** "2026-09" for any day in September 2026. */
export function monthKeyOf(day: DateKey): string {
  return day.slice(0, 7);
}

/**
 * The days to load for a month: a week either side of it, which covers the
 * leading and trailing days the month grid borrows from its neighbours.
 */
export function monthRange(month: string): { from: DateKey; to: DateKey } {
  const first = fromDateKey(`${month}-01`);
  const nextFirst = toDateKey(new Date(first.getFullYear(), first.getMonth() + 1, 1));
  return { from: addDaysToKey(`${month}-01`, -7), to: addDaysToKey(nextFirst, 7) };
}

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

/** "Thứ 6, 11/9". */
export function dayLabel(day: DateKey): string {
  const date = fromDateKey(day);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}`;
}
