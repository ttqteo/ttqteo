import { describe, expect, it } from "vitest";
import {
  CLOCK_AHEAD,
  filterNotes,
  foldText,
  isBlankNote,
  keepaliveSaves,
  MAX_CLOCK_AHEAD_MS,
  MAX_NOTE_LENGTH,
  nextStamp,
  notePreview,
  noteSaveBody,
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

  it("reads Windows line endings the same way", () => {
    expect(noteTitle("Tiêu đề\r\n- a\r\n- b")).toBe("Tiêu đề");
    expect(notePreview("Tiêu đề\r\n- a\r\n- b")).toBe("- a\n- b");
  });

  it("has nothing to show for a blank note", () => {
    expect(noteTitle("  \n ")).toBe("");
    expect(notePreview("  \n ")).toBe("");
  });
});

describe("isBlankNote", () => {
  it("counts whitespace alone as blank", () => {
    expect(isBlankNote(" \n\t\r\n ")).toBe(true);
    expect(isBlankNote(" x ")).toBe(false);
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

  it("compares timestamps as times, not as text", () => {
    // As text, "10:00:00+07:00" sorts after "03:00:00.900Z"; as a time it is
    // 03:00:00Z, the older of the two.
    const sorted = sortNotes([
      note({ body: "server", updated_at: "2026-09-11T10:00:00+07:00" }),
      note({ body: "browser", updated_at: "2026-09-11T03:00:00.900Z" }),
    ]);
    expect(sorted.map((n) => n.body)).toEqual(["browser", "server"]);
  });

  it("leaves the list it was given as it was", () => {
    const notes = [
      note({ body: "old", updated_at: "2026-09-01T00:00:00.000Z" }),
      note({ body: "new", updated_at: "2026-09-10T00:00:00.000Z" }),
    ];
    sortNotes(notes);
    expect(notes.map((n) => n.body)).toEqual(["old", "new"]);
  });
});

describe("foldText", () => {
  it("folds Vietnamese to plain lowercase, in either normal form", () => {
    expect(foldText("Tết")).toBe("tet");
    expect(foldText("Tết".normalize("NFD"))).toBe("tet");
    expect(foldText("ĐỒNG")).toBe("dong");
    expect(foldText("Ưu tiên ở Phường")).toBe("uu tien o phuong");
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

  it("finds a note stored decomposed with a query typed precomposed", () => {
    expect(filterNotes([note({ body: "Mua đồ Tết".normalize("NFD") })], "tết")).toHaveLength(1);
  });
});

describe("parseNoteInput", () => {
  const T = "2026-09-11T03:00:00.000Z";

  it("accepts a body, a pin and the edit's time", () => {
    expect(parseNoteInput({ body: "hi", pinned: false, updated_at: T })).toEqual({
      ok: true,
      input: { body: "hi", pinned: false, updated_at: T },
    });
  });

  it("keeps a readable created_at, for Undo", () => {
    const result = parseNoteInput({
      body: "hi",
      pinned: true,
      updated_at: T,
      created_at: "2026-09-01T00:00:00Z",
    });
    expect(result).toMatchObject({ ok: true, input: { created_at: "2026-09-01T00:00:00.000Z" } });
  });

  it("takes only the fields it knows, whatever else is sent", () => {
    const result = parseNoteInput({ body: "hi", pinned: false, updated_at: T, id: "evil", deleted: true });
    expect(result.ok && Object.keys(result.input).sort()).toEqual(["body", "pinned", "updated_at"]);
  });

  it("accepts a body exactly at the limit", () => {
    expect(
      parseNoteInput({ body: "x".repeat(MAX_NOTE_LENGTH), pinned: false, updated_at: T }),
    ).toMatchObject({ ok: true });
  });

  it("drops NUL, which Postgres text cannot hold", () => {
    const nul = String.fromCharCode(0);
    expect(parseNoteInput({ body: `a${nul}b`, pinned: false, updated_at: T })).toMatchObject({
      ok: true,
      input: { body: "ab" },
    });
  });

  it("replaces half a surrogate pair, which Postgres cannot store either", () => {
    expect(parseNoteInput({ body: "a\uD83Db", pinned: false, updated_at: T })).toMatchObject({
      ok: true,
      input: { body: "a\uFFFDb" },
    });
  });

  it("reads updated_at as an instant, whatever offset it was written with", () => {
    expect(
      parseNoteInput({ body: "hi", pinned: false, updated_at: "2026-09-11T10:00:00+07:00" }),
    ).toMatchObject({ ok: true, input: { updated_at: "2026-09-11T03:00:00.000Z" } });
  });

  it("takes a null created_at as none", () => {
    const result = parseNoteInput({ body: "hi", pinned: false, updated_at: T, created_at: null });
    expect(result.ok && Object.keys(result.input).sort()).toEqual(["body", "pinned", "updated_at"]);
  });

  it("refuses a stamp more than five minutes ahead of the server", () => {
    const now = Date.parse(T) - MAX_CLOCK_AHEAD_MS;
    expect(parseNoteInput({ body: "hi", pinned: false, updated_at: T }, now)).toMatchObject({ ok: true });
    expect(parseNoteInput({ body: "hi", pinned: false, updated_at: T }, now - 1)).toMatchObject({
      ok: false,
      code: CLOCK_AHEAD,
    });
  });

  it.each([
    ["no body", { pinned: false, updated_at: T }],
    ["a body that is not text", { body: 1, pinned: false, updated_at: T }],
    ["a body that is too long", { body: "x".repeat(MAX_NOTE_LENGTH + 1), pinned: false, updated_at: T }],
    ["no pin", { body: "hi", updated_at: T }],
    ["no updated_at", { body: "hi", pinned: false }],
    ["an unreadable updated_at", { body: "hi", pinned: false, updated_at: "now" }],
    ["an unreadable created_at", { body: "hi", pinned: false, updated_at: T, created_at: "yesterday" }],
    ["nothing at all", null],
  ])("rejects %s", (_label, value) => {
    expect(parseNoteInput(value)).toMatchObject({ ok: false });
  });
});

describe("noteSaveBody", () => {
  it("is a body the PUT accepts, with the edit's time", () => {
    const saved = note({ body: "Mua đồ Tết", pinned: true, updated_at: "2026-09-11T03:00:00.000Z" });
    expect(parseNoteInput(JSON.parse(noteSaveBody(saved)))).toEqual({
      ok: true,
      input: {
        body: "Mua đồ Tết",
        pinned: true,
        updated_at: "2026-09-11T03:00:00.000Z",
        created_at: "2026-09-01T00:00:00.000Z",
      },
    });
  });
});

describe("keepaliveSaves", () => {
  const edited = (body: string, updated_at: string) => note({ body, updated_at });

  it("sends the newest edit first", () => {
    const saves = keepaliveSaves(
      [edited("old", "2026-09-11T01:00:00.000Z"), edited("new", "2026-09-11T02:00:00.000Z")],
      60_000,
    );
    expect(saves.map((save) => save.id)).toEqual(["new", "old"]);
  });

  it("skips a note too big for what is left, and still sends a smaller one", () => {
    const saves = keepaliveSaves(
      [edited("x".repeat(500), "2026-09-11T02:00:00.000Z"), edited("nhỏ", "2026-09-11T01:00:00.000Z")],
      300,
    );
    expect(saves.map((save) => save.id)).toEqual(["nhỏ"]);
  });

  it("counts bytes, not characters", () => {
    // "ệ" is one character and three bytes in UTF-8.
    const long = edited("ệ".repeat(100), "2026-09-11T01:00:00.000Z");
    const characters = noteSaveBody(long).length;
    expect(keepaliveSaves([long], characters)).toEqual([]);
    expect(keepaliveSaves([long], characters + 200)).toHaveLength(1);
  });

  it("stops at the budget across notes, not per note", () => {
    const a = edited("aaa", "2026-09-11T02:00:00.000Z");
    const b = edited("bbb", "2026-09-11T01:00:00.000Z");
    const one = new TextEncoder().encode(noteSaveBody(a)).length;
    expect(keepaliveSaves([a, b], one + 10).map((save) => save.id)).toEqual(["aaa"]);
  });
});

describe("nextStamp", () => {
  const NOW = Date.parse("2026-09-11T03:00:00.000Z");

  it("is now, for a version stamped earlier", () => {
    expect(nextStamp("2026-09-11T02:59:00.000Z", NOW)).toBe("2026-09-11T03:00:00.000Z");
  });

  it("comes just after a version stamped by a clock running fast", () => {
    expect(nextStamp("2026-09-11T03:04:00.000Z", NOW)).toBe("2026-09-11T03:04:00.001Z");
  });

  it("comes after a Postgres stamp with microseconds", () => {
    expect(nextStamp("2026-09-11T03:00:00.000500+00:00", NOW)).toBe("2026-09-11T03:00:00.001Z");
  });

  it("is now when the previous stamp cannot be read", () => {
    expect(nextStamp("", NOW)).toBe("2026-09-11T03:00:00.000Z");
  });
});
