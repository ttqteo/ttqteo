import { badRequest, requireAdmin } from "@/lib/admin-api";
import type { CalendarEvent, CalendarPayload } from "@/lib/calendar-events";
import { expandFeed, parseFeedsConfig, type FeedOccurrence } from "@/lib/calendar-feed";
import { addDaysToKey, isDateKey } from "@/lib/date-key";
import { revalidateTag, unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TAG = "admin-calendar";
const FETCH_TIMEOUT_MS = 8_000;
// A month grid asks for about 45 days; this only stops a runaway request.
const MAX_RANGE_DAYS = 62;

/**
 * One feed's occurrences in [from, to). Looked up by name so the secret URL
 * never becomes part of a cache key. Throws on failure, which keeps a failed
 * download out of the cache below.
 */
async function fetchFeedRange(name: string, from: string, to: string): Promise<FeedOccurrence[]> {
  const config = parseFeedsConfig(process.env.ADMIN_CALENDAR_FEEDS);
  const feed = config.ok ? config.feeds.find((f) => f.name === name) : undefined;
  if (!feed) throw new Error(`Không có lịch "${name}"`);

  const response = await fetch(feed.url, {
    // Next's fetch cache refuses anything over 2MB, and years of a work
    // calendar are easily more, so the expanded result is cached instead.
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return expandFeed(await response.text(), from, to);
}

const cachedFeedRange = unstable_cache(fetchFeedRange, ["admin-calendar-feed"], {
  revalidate: 300,
  tags: [CACHE_TAG],
});

// GET /api/admin/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD[&fresh=1]
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!isDateKey(from) || !isDateKey(to) || to <= from || addDaysToKey(from, MAX_RANGE_DAYS) < to) {
    return badRequest(`from và to phải là YYYY-MM-DD, from trước to, cách nhau tối đa ${MAX_RANGE_DAYS} ngày`);
  }

  const config = parseFeedsConfig(process.env.ADMIN_CALENDAR_FEEDS);
  if (!config.ok) {
    const payload: CalendarPayload = { configured: false, events: [], failed: [], error: config.error };
    return NextResponse.json(payload);
  }

  // ↻ in the panel: skip the cache for this answer and drop what it holds, so
  // an event just made in Google shows now rather than in five minutes.
  const fresh = searchParams.get("fresh") === "1";
  if (fresh) revalidateTag(CACHE_TAG, { expire: 0 });
  const load = fresh ? fetchFeedRange : cachedFeedRange;

  const results = await Promise.allSettled(config.feeds.map((feed) => load(feed.name, from, to)));

  const events: CalendarEvent[] = [];
  const failed: string[] = [];
  results.forEach((result, index) => {
    const feed = config.feeds[index];
    if (result.status === "rejected") {
      console.error(`[admin calendar] ${feed.name}:`, result.reason);
      failed.push(feed.name);
      return;
    }
    for (const occurrence of result.value) {
      events.push({ ...occurrence, calendar: feed.name, color: feed.color });
    }
  });

  const payload: CalendarPayload = { configured: true, events, failed };
  return NextResponse.json(payload);
}
