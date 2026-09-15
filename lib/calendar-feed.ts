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
    // A raw space would otherwise be silently percent-encoded by `new URL()`
    // rather than rejected, so it needs its own check.
    if (/\s/.test(url)) {
      return { ok: false, error: `Lịch "${name}" có URL chứa khoảng trắng` };
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { ok: false, error: `Lịch "${name}" có URL không hợp lệ` };
    }
    if (parsedUrl.protocol !== "https:") {
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
  const vtimezones = root.getAllSubcomponents("vtimezone");
  for (const vtimezone of vtimezones) {
    ICAL.TimezoneService.register(vtimezone);
  }
  // Only a TZID this feed defines itself gets ical.js's own zone maths.
  // ICAL.TimezoneService is a process-wide registry, so a TZID left
  // unregistered by THIS feed could still resolve if some other feed fetched
  // earlier in the same process happened to register that name; resolveInstant
  // below never trusts that, and instead recomputes from the literal
  // wall-clock digits whenever this feed does not define the zone itself.
  const definedTzids = new Set(
    vtimezones.map((vtimezone) => String(vtimezone.getFirstPropertyValue("tzid") ?? "")),
  );

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
    const occurrence = toOccurrence(item, start, end, definedTzids);
    // A TZID Intl does not recognise either: nothing sane to fall back to.
    if (!occurrence) return;
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

function toOccurrence(
  item: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time | null,
  definedTzids: Set<string>,
): FeedOccurrence | null {
  const allDay = start.isDate;
  let startValue: string;
  let endValue: string;

  if (allDay) {
    startValue = dateKeyOf(start);
    endValue = end?.isDate ? dateKeyOf(end) : addDaysToKey(startValue, 1);
    // DTEND is exclusive; a feed that repeats DTSTART there still means one day.
    if (endValue <= startValue) endValue = addDaysToKey(startValue, 1);
  } else {
    const startTzid = item.component.getFirstProperty("dtstart")?.getParameter("tzid") as
      | string
      | undefined;
    const endTzid =
      (item.component.getFirstProperty("dtend")?.getParameter("tzid") as string | undefined) ??
      startTzid;
    const startMs = resolveInstant(start, startTzid, definedTzids);
    const endMs = end ? resolveInstant(end, endTzid, definedTzids) : startMs;
    if (startMs === null || endMs === null) return null;
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

/**
 * The real UTC instant for a timed value. A TZID this feed defines itself
 * gets ical.js's own zone maths (`time.toJSDate()`); anything else - a TZID
 * the feed does not define, or none at all (floating) - is converted from
 * its literal wall-clock digits with Intl instead, since trusting `time.zone`
 * there would depend on whatever another feed left in ical.js's shared
 * timezone registry. Returns null when the TZID names a zone Intl does not
 * recognise, so the caller can skip just that event.
 */
function resolveInstant(
  time: ICAL.Time,
  tzid: string | undefined,
  definedTzids: Set<string>,
): number | null {
  if (tzid) {
    if (definedTzids.has(tzid)) return time.toJSDate().getTime();
    return zonedWallTimeToUtcMs(time, tzid);
  }
  // No TZID and no trailing Z: a floating time. The feeds this reads are the
  // owner's own, so treat that as their zone rather than the server's.
  if (time.zone?.tzid === "floating") return zonedWallTimeToUtcMs(time, "Asia/Ho_Chi_Minh");
  return time.toJSDate().getTime();
}

/**
 * A wall-clock date/time in an IANA zone, as a UTC instant (ms). Guesses the
 * instant by first reading the zone's offset as if the wall time were
 * already UTC, then re-reads the offset at that guess to settle a DST edge
 * where the two disagree. Returns null when `timeZone` is not a name Intl
 * recognises.
 */
function zonedWallTimeToUtcMs(time: ICAL.Time, timeZone: string): number | null {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return null;
  }

  const offsetAt = (instant: number): number => {
    const parts: Record<string, number> = {};
    for (const part of formatter.formatToParts(instant)) {
      if (part.type !== "literal") parts[part.type] = Number(part.value);
    }
    const hour = parts.hour === 24 ? 0 : parts.hour;
    const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, parts.minute, parts.second);
    return asIfUtc - instant;
  };

  const wallAsUtcMs = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
  const firstGuess = offsetAt(wallAsUtcMs);
  const instant = wallAsUtcMs - firstGuess;
  const secondGuess = offsetAt(instant);
  return secondGuess === firstGuess ? instant : wallAsUtcMs - secondGuess;
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
