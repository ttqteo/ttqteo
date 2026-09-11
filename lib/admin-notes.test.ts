import { describe, expect, it } from "vitest";
import {
  filterNotes,
  MAX_NOTE_LENGTH,
  notePreview,
  noteTitle,
  parseNoteInput,
  sortNotes,
  type AdminNote,
} from "@/lib/admin-notes";

function note(overrides: Partial<AdminNote>): AdminNote {
  return {
    id: overrides.body ?? "n",
    body: "",
    pinned: false,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("noteTitle / notePreview", () => {
  const body = "\n  Mua đồ Tết  \n- lạp vịt\n\n- bánh\n- mứt\n- hoa";

  it("takes the first non-blank line as the title", () => {
    expect(noteTitle(body)).toBe("Mua đồ Tết");
  });

  it("previews the next three non-blank lines", () => {
    expect(notePreview(body)).toBe("- lạp vịt\n- bánh\n- mứt");
  });

  it("has nothing to show for a blank note", () => {
    expect(noteTitle("  \n ")).toBe("");
    expect(notePreview("  \n ")).toBe("");
  });
});

describe("sortNotes", () => {
  it("puts pinned notes first, then the most recently edited", () => {
    const sorted = sortNotes([
      note({ body: "old", updated_at: "2026-09-01T00:00:00.000Z" }),
      note({ body: "pinned", pinned: true, updated_at: "2026-08-01T00:00:00.000Z" }),
      note({ body: "new", updated_at: "2026-09-10T00:00:00.000Z" }),
    ]);
    expect(sorted.map((n) => n.body)).toEqual(["pinned", "new", "old"]);
  });

  it("compares Postgres and browser timestamps as times", () => {
    const sorted = sortNotes([
      note({ body: "server", updated_at: "2026-09-11T03:00:00.500000+00:00" }),
      note({ body: "browser", updated_at: "2026-09-11T03:00:00.900Z" }),
    ]);
    expect(sorted.map((n) => n.body)).toEqual(["browser", "server"]);
  });
});

describe("filterNotes", () => {
  const notes = [note({ body: "Mua đồ Tết" }), note({ body: "Tiền đồng" }), note({ body: "Report" })];

  it("ignores case and Vietnamese marks", () => {
    expect(filterNotes(notes, "tet").map((n) => n.body)).toEqual(["Mua đồ Tết"]);
    expect(filterNotes(notes, "DONG").map((n) => n.body)).toEqual(["Tiền đồng"]);
  });

  it("needs every word", () => {
    expect(filterNotes(notes, "mua tet").map((n) => n.body)).toEqual(["Mua đồ Tết"]);
    expect(filterNotes(notes, "mua report")).toEqual([]);
  });

  it("returns everything for a blank query", () => {
    expect(filterNotes(notes, "  ")).toHaveLength(3);
  });
});

describe("parseNoteInput", () => {
  it("accepts a body and a pin", () => {
    expect(parseNoteInput({ body: "hi", pinned: false })).toEqual({
      ok: true,
      input: { body: "hi", pinned: false },
    });
  });

  it("keeps a readable created_at, for Undo", () => {
    const result = parseNoteInput({ body: "hi", pinned: true, created_at: "2026-09-01T00:00:00Z" });
    expect(result).toMatchObject({ ok: true, input: { created_at: "2026-09-01T00:00:00.000Z" } });
  });

  it.each([
    ["no body", { pinned: false }],
    ["a body that is not text", { body: 1, pinned: false }],
    ["a body that is too long", { body: "x".repeat(MAX_NOTE_LENGTH + 1), pinned: false }],
    ["no pin", { body: "hi" }],
    ["nothing at all", null],
  ])("rejects %s", (_label, value) => {
    expect(parseNoteInput(value)).toMatchObject({ ok: false });
  });
});
