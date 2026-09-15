import ICAL from "ical.js";
import type { CalendarEvent } from "@/lib/calendar-events";
import { addDaysToKey, type DateKey } from "@/lib/date-key";

/**
 * Reads Google Calendar's iCal export on the server. Server only: the feed
 * URLs are secret (each one reads a whole calendar) and ical.js has no
 * business in the client bundle.
 */

export type CalendarFeed = { name: string; color: string; url: string };

export type FeedsConfig =
  | { ok: true; feeds: CalendarFeed[] }
  | { ok: false; error: string };

const FALLBACK_COLORS = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2"];

/**
 * `ADMIN_CALENDAR_FEEDS`: a JSON array of `{ name, url, color? }`. Errors name
 * the entry by position and never echo its URL, since the message can reach
 * the panel.
 */
export function parseFeedsConfig(raw: string | undefined): FeedsConfig {
  if (!raw?.trim()) return { ok: false, error: "ADMIN_CALENDAR_FEEDS chưa được đặt" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "ADMIN_CALENDAR_FEEDS không phải JSON hợp lệ" };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "ADMIN_CALENDAR_FEEDS phải là một mảng" };
  }

  const feeds: CalendarFeed[] = [];
  for (const [index, item] of parsed.entries()) {
    const entry = (item ?? {}) as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const rawUrl = typeof entry.url === "string" ? entry.url.trim() : "";
    if (!name || !rawUrl) {
      return { ok: false, error: `Lịch thứ ${index + 1} thiếu name hoặc url` };
    }
    // The route looks a feed up by name, so two with the same name would shadow.
    if (feeds.some((feed) => feed.name === name)) {
      return { ok: false, error: `Có hai lịch cùng tên "${name}"` };
    }
    // Apple, and Google in places, hand out webcal://, which is https underneath.
    const url = rawUrl.replace(/^webcal:\/\//i, "https://");
    if (!/^https:\/\//i.test(url)) {
      return { ok: false, error: `Lịch "${name}" phải dùng https` };
    }
    const color =
      typeof entry.color === "string" && /^#[0-9a-f]{6}$/i.test(entry.color)
        ? entry.color
        : FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    feeds.push({ name, color, url });
  }
  return { ok: true, feeds };
}

/** An occurrence before the route stamps it with its calendar's name and colour. */
export type FeedOccurrence = Omit<CalendarEvent, "calendar" | "color">;

// A daily series started years ago is a few thousand steps; this only stops a
// pathological rule (every minute, no end) from spinning.
const MAX_ITERATIONS = 50_000;
const MAX_DESCRIPTION = 2_000;

/**
 * Every occurrence in the feed that touches [from, to), recurring events
 * expanded, EXDATEs dropped and moved instances at their new time.
 *
 * The range is widened by a day each side because the server does not know
 * the viewer's time zone. The client trims to exact local days with
 * `occursOn`, so the extra day is only ever a little more data.
 */
export function expandFeed(ics: string, from: DateKey, to: DateKey): FeedOccurrence[] {
  const root = new ICAL.Component(ICAL.parse(ics));

  // A time written as TZID=Asia/Ho_Chi_Minh means nothing to ical.js until the
  // zone is registered. Unregistered, it is read as floating and lands in the
  // server's own zone: seven hours off on Vercel, where that is UTC.
  for (const vtimezone of root.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(vtimezone);
  }

  const lo = addDaysToKey(from, -1);
  const hi = addDaysToKey(to, 1);
  const loMs = utcMidnight(lo);
  const hiMs = utcMidnight(hi);

  const masters: ICAL.Component[] = [];
  const exceptionsByUid = new Map<string, ICAL.Component[]>();
  for (const vevent of root.getAllSubcomponents("vevent")) {
    if (!vevent.hasProperty("recurrence-id")) {
      masters.push(vevent);
      continue;
    }
    const uid = String(vevent.getFirstPropertyValue("uid") ?? "");
    exceptionsByUid.set(uid, [...(exceptionsByUid.get(uid) ?? []), vevent]);
  }

  const out: FeedOccurrence[] = [];
  const push = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
    if (item.component.getFirstPropertyValue("status") === "CANCELLED") return;
    const occurrence = toOccurrence(item, start, end);
    const inRange = occurrence.allDay
      ? occurrence.start < hi && occurrence.end > lo
      : Date.parse(occurrence.start) < hiMs && Date.parse(occurrence.end) > loMs;
    if (inRange) out.push(occurrence);
  };

  const seriesUids = new Set<string>();
  for (const vevent of masters) {
    const exceptions = exceptionsByUid.get(String(vevent.getFirstPropertyValue("uid") ?? "")) ?? [];
    const event = new ICAL.Event(vevent, { exceptions });
    seriesUids.add(event.uid);

    if (!event.isRecurring()) {
      push(event, event.startDate, event.endDate);
      continue;
    }

    const iterator = event.iterator();
    for (let i = 0, next = iterator.next(); next && i < MAX_ITERATIONS; i++, next = iterator.next()) {
      if (next.toJSDate().getTime() >= hiMs) break;
      const details = event.getOccurrenceDetails(next);
      push(details.item, details.startDate, details.endDate);
    }

    // An instance moved into the range from a slot after it is never reached
    // by the loop above, which stops at `hi`.
    for (const vexception of exceptions) {
      const exception = new ICAL.Event(vexception);
      if (exception.recurrenceId.toJSDate().getTime() >= hiMs) {
        push(exception, exception.startDate, exception.endDate);
      }
    }
  }

  // Moved instances whose series is not in this feed, as with some invitations.
  for (const [uid, exceptions] of exceptionsByUid) {
    if (seriesUids.has(uid)) continue;
    for (const vexception of exceptions) {
      const exception = new ICAL.Event(vexception);
      push(exception, exception.startDate, exception.endDate);
    }
  }

  return out;
}

function toOccurrence(item: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null): FeedOccurrence {
  const allDay = start.isDate;
  let startValue: string;
  let endValue: string;

  if (allDay) {
    startValue = dateKeyOf(start);
    endValue = end?.isDate ? dateKeyOf(end) : addDaysToKey(startValue, 1);
    // DTEND is exclusive; a feed that repeats DTSTART there still means one day.
    if (endValue <= startValue) endValue = addDaysToKey(startValue, 1);
  } else {
    const startMs = start.toJSDate().getTime();
    const endMs = end ? end.toJSDate().getTime() : startMs;
    startValue = new Date(startMs).toISOString();
    endValue = new Date(Math.max(startMs, endMs)).toISOString();
  }

  const description = item.description?.trim();
  return {
    id: `${item.uid}/${startValue}`,
    title: item.summary?.trim() || "(Không có tiêu đề)",
    location: item.location?.trim() || null,
    description: description ? description.slice(0, MAX_DESCRIPTION) : null,
    allDay,
    start: startValue,
    end: endValue,
  };
}

/** The date as written in the feed, with no time zone applied. */
function dateKeyOf(time: ICAL.Time): DateKey {
  const month = String(time.month).padStart(2, "0");
  const day = String(time.day).padStart(2, "0");
  return `${time.year}-${month}-${day}`;
}

function utcMidnight(key: DateKey): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
