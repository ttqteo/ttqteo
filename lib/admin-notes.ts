import { parseTimestamp } from "@/lib/admin-db";

/**
 * Ghi nhanh: the side panel's Keep-style notes, one row each in admin_notes.
 * Plain text; the first non-blank line doubles as the title.
 */
export type AdminNote = {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export const MAX_NOTE_LENGTH = 20_000;

/** The columns every notes route reads and returns. */
export const NOTE_COLUMNS = "id, body, pinned, created_at, updated_at";

const lines = (body: string) =>
  body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function noteTitle(body: string): string {
  return lines(body)[0] ?? "";
}

/** Up to `maxLines` non-blank lines after the title, for the card. */
export function notePreview(body: string, maxLines = 3): string {
  return lines(body).slice(1, 1 + maxLines).join("\n");
}

export function isBlankNote(body: string): boolean {
  return body.trim() === "";
}

/**
 * Pinned first, then most recently edited. Compared as dates, not strings:
 * rows from Postgres say `+00:00` with microseconds, rows made in the browser
 * say `Z` with milliseconds, and the two do not sort as text.
 */
export function sortNotes(notes: AdminNote[]): AdminNote[] {
  return [...notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
}

/** Lowercase, Vietnamese marks gone: "Tết" becomes "tet", "đồng" becomes "dong". */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");
}

/** Notes containing every word of the query, ignoring case and marks. */
export function filterNotes(notes: AdminNote[], query: string): AdminNote[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return notes;
  return notes.filter((note) => {
    const body = foldText(note.body);
    return words.every((word) => body.includes(word));
  });
}

export type NoteInput = { body: string; pinned: boolean; updated_at: string; created_at?: string };

/**
 * How far ahead of the server's clock an edit's stamp may be. The newest edit
 * wins, so a stamp from a clock running fast would pin the note: every edit
 * made on a right clock would count as older and lose until that time came.
 */
export const MAX_CLOCK_AHEAD_MS = 5 * 60_000;

const NUL = String.fromCharCode(0);

/**
 * Checks a PUT body for /api/admin/notes/[id]. `updated_at` is the browser's
 * stamp for this edit and decides which of two saves wins, so it is required,
 * and refused when it is further ahead of `now` than MAX_CLOCK_AHEAD_MS.
 * `created_at` comes back only with Undo; unreadable, it is refused rather
 * than quietly replaced with now.
 */
export function parseNoteInput(
  value: unknown,
  now = Date.now(),
): { ok: true; input: NoteInput } | { ok: false; error: string } {
  const data = (value ?? {}) as Record<string, unknown>;
  if (typeof data.body !== "string") return { ok: false, error: "body phải là chuỗi" };
  // Postgres stores neither NUL nor half of a surrogate pair, and left in,
  // either would fail every retry of the save. U+FFFD keeps the length.
  const body = data.body.split(NUL).join("").toWellFormed();
  if (body.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Note dài quá ${MAX_NOTE_LENGTH.toLocaleString("vi-VN")} ký tự` };
  }
  if (typeof data.pinned !== "boolean") return { ok: false, error: "pinned phải là true hoặc false" };

  const updatedAt = parseTimestamp(data.updated_at);
  if (!updatedAt) return { ok: false, error: "updated_at không đọc được" };
  if (Date.parse(updatedAt) - now > MAX_CLOCK_AHEAD_MS) {
    return { ok: false, error: "Giờ trên máy đang nhanh hơn server, chỉnh lại giờ máy rồi thử lại" };
  }

  let createdAt: string | undefined;
  if (data.created_at != null) {
    const parsed = parseTimestamp(data.created_at);
    if (!parsed) return { ok: false, error: "created_at không đọc được" };
    createdAt = parsed;
  }

  return {
    ok: true,
    input: {
      body,
      pinned: data.pinned,
      updated_at: updatedAt,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  };
}
