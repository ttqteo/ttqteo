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

export type NoteInput = { body: string; pinned: boolean; created_at?: string };

/** Checks a PUT body for /api/admin/notes/[id]. */
export function parseNoteInput(
  value: unknown,
): { ok: true; input: NoteInput } | { ok: false; error: string } {
  const data = (value ?? {}) as Record<string, unknown>;
  if (typeof data.body !== "string") return { ok: false, error: "body phải là chuỗi" };
  if (data.body.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Note dài quá ${MAX_NOTE_LENGTH} ký tự` };
  }
  if (typeof data.pinned !== "boolean") return { ok: false, error: "pinned phải là true hoặc false" };

  const createdAt = parseTimestamp(data.created_at);
  return {
    ok: true,
    input: { body: data.body, pinned: data.pinned, ...(createdAt ? { created_at: createdAt } : {}) },
  };
}
