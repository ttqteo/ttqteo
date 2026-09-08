import { beforeEach, describe, expect, it } from "vitest";
import {
  DRAFT_TTL_MS,
  clearEditorDraft,
  draftDiffersFrom,
  draftKey,
  readEditorDraft,
  saveEditorDraft,
  type EditorDraftBody,
} from "./editor-draft";

const body: EditorDraftBody = {
  title: "dev thời đại AI",
  description: "",
  content: "<p>giờ claude hay codex đều thông minh lắm rồi</p>",
  tags: "ai, tech",
  slug: "2026/09/08/dev-thoi-dai-ai",
};

beforeEach(() => {
  localStorage.clear();
});

describe("draftKey", () => {
  it("scopes new posts separately from saved ones", () => {
    expect(draftKey(null)).not.toBe(draftKey("abc"));
  });

  it("gives each post its own slot", () => {
    expect(draftKey("abc")).not.toBe(draftKey("def"));
  });
});

describe("saveEditorDraft / readEditorDraft", () => {
  it("round-trips a draft", () => {
    saveEditorDraft("abc", body, 1000);
    expect(readEditorDraft("abc", 1000)).toEqual({ ...body, savedAt: 1000 });
  });

  it("does not leak between posts", () => {
    saveEditorDraft("abc", body, 1000);
    expect(readEditorDraft("def", 1000)).toBeNull();
  });

  it("returns null when there is nothing stored", () => {
    expect(readEditorDraft("abc", 1000)).toBeNull();
  });

  it("drops and clears a draft past the TTL", () => {
    saveEditorDraft("abc", body, 1000);
    expect(readEditorDraft("abc", 1000 + DRAFT_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem(draftKey("abc"))).toBeNull();
  });

  it("keeps a draft that is exactly at the TTL edge", () => {
    saveEditorDraft("abc", body, 1000);
    expect(readEditorDraft("abc", 1000 + DRAFT_TTL_MS)).not.toBeNull();
  });

  it("discards unparseable or shapeless entries instead of throwing", () => {
    localStorage.setItem(draftKey("abc"), "{not json");
    expect(readEditorDraft("abc", 1000)).toBeNull();

    localStorage.setItem(draftKey("abc"), JSON.stringify({ title: "no timestamp" }));
    expect(readEditorDraft("abc", 1000)).toBeNull();
  });
});

describe("clearEditorDraft", () => {
  it("removes only the requested post's draft", () => {
    saveEditorDraft("abc", body, 1000);
    saveEditorDraft("def", body, 1000);
    clearEditorDraft("abc");
    expect(readEditorDraft("abc", 1000)).toBeNull();
    expect(readEditorDraft("def", 1000)).not.toBeNull();
  });
});

describe("draftDiffersFrom", () => {
  it("is false when every field matches", () => {
    expect(draftDiffersFrom({ ...body, savedAt: 1 }, body)).toBe(false);
  });

  it("is true when the content differs", () => {
    expect(
      draftDiffersFrom({ ...body, savedAt: 1 }, { ...body, content: "<p>khác</p>" }),
    ).toBe(true);
  });

  it("is true when the title differs", () => {
    expect(draftDiffersFrom({ ...body, savedAt: 1 }, { ...body, title: "khác" })).toBe(
      true,
    );
  });

  it("ignores the slug, which the editor regenerates on its own", () => {
    // A new post rebuilds its slug with a fresh random suffix on every mount, so
    // comparing it would offer a restore banner on a draft nothing has touched.
    expect(
      draftDiffersFrom({ ...body, savedAt: 1 }, { ...body, slug: "2026/09/08/other" }),
    ).toBe(false);
  });
});
