import type { UnfurlResult } from "@/lib/unfurl";

/**
 * What the unfurl route said about each URL the Ghi nhanh panel has shown,
 * kept for the page's lifetime so reopening a note never fetches its links
 * again. A small external store, read with useSyncExternalStore: `undefined`
 * is a URL never asked about, `null` one the route could not read.
 *
 * Module state rather than context, because the answer for a URL is the same
 * whichever note it appears in.
 */

export const UNFURL_CACHE_MAX = 200;

const answers = new Map<string, UnfurlResult | null>();
const loading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

export function readUnfurl(url: string): UnfurlResult | null | undefined {
  return answers.get(url);
}

export function subscribeUnfurl(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function remember(url: string, answer: UnfurlResult | null): void {
  answers.set(url, answer);
  // Insertion order is age; the first key is the oldest.
  while (answers.size > UNFURL_CACHE_MAX) {
    const oldest = answers.keys().next().value;
    if (oldest === undefined) break;
    answers.delete(oldest);
  }
  for (const listener of listeners) listener();
}

async function fetchUnfurl(url: string): Promise<UnfurlResult | null> {
  try {
    const res = await fetch("/api/admin/unfurl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    return (await res.json()) as UnfurlResult;
  } catch {
    return null;
  }
}

/** Asks the route about `url` unless it has been asked already, or is being asked now. */
export function loadUnfurl(url: string): Promise<void> {
  if (answers.has(url)) return Promise.resolve();
  const inFlight = loading.get(url);
  if (inFlight) return inFlight;
  const request = fetchUnfurl(url).then((answer) => {
    loading.delete(url);
    remember(url, answer);
  });
  loading.set(url, request);
  return request;
}
