export const READER_RESUME_KEY = "ttqteo:reader-resume";
export const WRITER_RESUME_KEY = "ttqteo:writer-resume";
export const RESUME_SHOWN_KEY = "ttqteo:resume-shown";

const DAY_MS = 24 * 60 * 60 * 1000;
export const READER_TTL_MS = 7 * DAY_MS;
export const WRITER_TTL_MS = 30 * DAY_MS;

export type ReaderResume = {
  slug: string;
  title: string;
  scrollPct: number;
  headingId?: string;
  headingText?: string;
  updatedAt: number;
};

export type WriterResume = {
  postId: string;
  title: string;
  route: string;
  updatedAt: number;
};

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readJSON<T>(key: string, ttlMs: number, now: number): T | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as T & { updatedAt?: number };
    if (!parsed || typeof parsed.updatedAt !== "number") {
      safeRemove(key);
      return null;
    }
    if (now - parsed.updatedAt > ttlMs) {
      safeRemove(key);
      return null;
    }
    return parsed as T;
  } catch {
    safeRemove(key);
    return null;
  }
}

export function getReaderResume(now: number = Date.now()): ReaderResume | null {
  return readJSON<ReaderResume>(READER_RESUME_KEY, READER_TTL_MS, now);
}

export function setReaderResume(entry: ReaderResume): void {
  safeSet(READER_RESUME_KEY, JSON.stringify(entry));
}

export function clearReaderResume(): void {
  safeRemove(READER_RESUME_KEY);
}

export function getWriterResume(now: number = Date.now()): WriterResume | null {
  return readJSON<WriterResume>(WRITER_RESUME_KEY, WRITER_TTL_MS, now);
}

export function setWriterResume(entry: WriterResume): void {
  safeSet(WRITER_RESUME_KEY, JSON.stringify(entry));
}

export function clearWriterResume(): void {
  safeRemove(WRITER_RESUME_KEY);
}

export function hasResumeShown(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(RESUME_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markResumeShown(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RESUME_SHOWN_KEY, "1");
  } catch {
    /* ignore */
  }
}
