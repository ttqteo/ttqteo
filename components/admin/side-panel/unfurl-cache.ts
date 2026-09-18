import type { UnfurlResult } from "@/lib/unfurl";

/**
 * What the unfurl route said about each URL a note has shown. A small
 * external store, read with useSyncExternalStore: `undefined` is a URL never
 * asked about, `null` one the route could not read.
 *
 * Answers are kept in localStorage for a week, so the cards on the notes
 * page, which each look up their first link, ask about a link once and not
 * on every load. A failure stays in memory only, so a reload retries it.
 * Module state rather than context, because the answer for a URL is the same
 * whichever note it appears in.
 */

export const UNFURL_CACHE_MAX = 200;
const STORAGE_KEY = "ttqteo:unfurl:v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

type Stored = Record<string, { at: number; answer: UnfurlResult }>;

const answers = new Map<string, UnfurlResult | null>();
const askedAt = new Map<string, number>();
const loading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function restore(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as Stored;
    const now = Date.now();
    for (const [url, entry] of Object.entries(stored)) {
      if (!entry || typeof entry.at !== "number" || now - entry.at > MAX_AGE_MS) continue;
      if (!entry.answer || typeof entry.answer !== "object") continue;
      answers.set(url, entry.answer);
      askedAt.set(url, entry.at);
    }
  } catch {
    /* unreadable or blocked: start empty */
  }
}
restore();

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const stored: Stored = {};
    for (const [url, answer] of answers) {
      if (answer) stored[url] = { at: askedAt.get(url) ?? Date.now(), answer };
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* blocked or full: this page still has it in memory */
  }
}

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
  askedAt.set(url, Date.now());
  // Insertion order is age; the first key is the oldest.
  while (answers.size > UNFURL_CACHE_MAX) {
    const oldest = answers.keys().next().value;
    if (oldest === undefined) break;
    answers.delete(oldest);
    askedAt.delete(oldest);
  }
  persist();
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
