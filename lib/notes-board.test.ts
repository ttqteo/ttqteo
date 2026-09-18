import { describe, expect, it } from "vitest";
import type { AdminNote } from "./admin-notes";
import { boardItems, htmlText, type PostNoteSource } from "./notes-board";

const quick = (id: string, body: string, updated_at: string, pinned = false): AdminNote => ({
  id,
  body,
  pinned,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at,
});
const post = (id: string, updatedAt: string, notes: string[], title = `Bài ${id}`): PostNoteSource => ({
  id,
  title,
  isPublished: true,
  updatedAt,
  notes,
});
const keys = (items: { key: string }[]) => items.map((item) => item.key);

describe("htmlText", () => {
  it("reads the words out of a note's HTML", () => {
    expect(htmlText("<p>Xin <strong>chào</strong>&nbsp;bạn</p><p>nhé &amp; hết</p>")).toBe(
      "Xin chào bạn nhé & hết",
    );
  });
});

describe("boardItems", () => {
  const notes = [
    quick("q1", "một", "2026-09-10T00:00:00.000Z"),
    quick("q2", "hai ghim", "2026-09-05T00:00:00.000Z", true),
    quick("q3", "ba", "2026-09-12T00:00:00.000Z"),
  ];
  const posts = [
    post("p1", "2026-09-11T00:00:00.000Z", ["<p>note A</p>", "<p>note B</p>"]),
    post("p2", "2026-09-01T00:00:00.000Z", ["<p>Tết này</p>"]),
  ];

  it("puts pinned quick notes in their own group, then mixes the rest by last edit", () => {
    const { pinned, others } = boardItems(notes, posts, { query: "", filter: "all" });
    expect(keys(pinned)).toEqual(["quick:q2"]);
    expect(keys(others)).toEqual(["quick:q3", "post:p1:0", "post:p1:1", "quick:q1", "post:p2:0"]);
  });

  it("gives each note of a post its own card, in the post's order", () => {
    const { others } = boardItems(notes, posts, { query: "", filter: "post" });
    const p1 = others.filter((item) => item.kind === "post" && item.post.id === "p1");
    expect(p1.map((item) => (item.kind === "post" ? item.html : ""))).toEqual([
      "<p>note A</p>",
      "<p>note B</p>",
    ]);
  });

  it("filters to one kind", () => {
    const onlyQuick = boardItems(notes, posts, { query: "", filter: "quick" });
    expect(keys(onlyQuick.pinned)).toEqual(["quick:q2"]);
    expect(keys(onlyQuick.others)).toEqual(["quick:q3", "quick:q1"]);
    const onlyPost = boardItems(notes, posts, { query: "", filter: "post" });
    expect(onlyPost.pinned).toEqual([]);
    expect(keys(onlyPost.others)).toEqual(["post:p1:0", "post:p1:1", "post:p2:0"]);
  });

  it("searches both kinds, ignoring case and marks, and the post's title too", () => {
    expect(keys(boardItems(notes, posts, { query: "tet", filter: "all" }).others)).toEqual([
      "post:p2:0",
    ]);
    expect(keys(boardItems(notes, posts, { query: "GHIM", filter: "all" }).pinned)).toEqual([
      "quick:q2",
    ]);
    expect(keys(boardItems(notes, posts, { query: "bài p1", filter: "all" }).others)).toEqual([
      "post:p1:0",
      "post:p1:1",
    ]);
  });
});
