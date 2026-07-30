import { describe, expect, it } from "vitest";
import {
  GUIDE_SERIES,
  getSeriesByTag,
  hasTag,
  groupChapters,
  flattenChapters,
  prevNext,
  type GuideSeries,
} from "@/lib/guides";
import type { UnifiedPost } from "@/lib/posts";

function post(overrides: Partial<UnifiedPost> & { id: string }): UnifiedPost {
  return {
    slug: `slug-${overrides.id}`,
    title: `Post ${overrides.id}`,
    type: "guide",
    isPublished: true,
    source: "supabase",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tags: "system-design",
    ...overrides,
  };
}

const series: GuideSeries = {
  tag: "system-design",
  title: "System Design",
  description: "test",
  sections: [
    { key: "concepts", title: "Core Concepts" },
    { key: "problems", title: "Common Problems" },
  ],
};

describe("getSeriesByTag", () => {
  it("finds a declared series and returns undefined otherwise", () => {
    expect(getSeriesByTag(GUIDE_SERIES[0].tag)).toBe(GUIDE_SERIES[0]);
    expect(getSeriesByTag("nope")).toBeUndefined();
  });
});

describe("hasTag", () => {
  it("matches comma-separated tags, trimmed, and ignores partial matches", () => {
    expect(hasTag(post({ id: "a", tags: "ai, system-design" }), "system-design")).toBe(true);
    expect(hasTag(post({ id: "a", tags: "system-design-2" }), "system-design")).toBe(false);
    expect(hasTag(post({ id: "a", tags: undefined }), "system-design")).toBe(false);
  });
});

describe("groupChapters", () => {
  it("keeps only published guides carrying the series tag", () => {
    const posts = [
      post({ id: "1", guideSection: "concepts", guideOrder: 1 }),
      post({ id: "2", type: "post" }),
      post({ id: "3", isPublished: false }),
      post({ id: "4", tags: "other" }),
    ];
    const grouped = groupChapters(posts, series);
    expect(grouped.flatMap((g) => g.chapters).map((c) => c.id)).toEqual(["1"]);
  });

  it("groups by section in config order and sorts by guideOrder", () => {
    const posts = [
      post({ id: "p1", guideSection: "problems", guideOrder: 1 }),
      post({ id: "c2", guideSection: "concepts", guideOrder: 2.5 }),
      post({ id: "c1", guideSection: "concepts", guideOrder: 1 }),
    ];
    const grouped = groupChapters(posts, series);
    expect(grouped.map((g) => g.section.key)).toEqual(["concepts", "problems"]);
    expect(grouped[0].chapters.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("puts unknown or missing sections into a trailing bucket instead of dropping them", () => {
    const posts = [
      post({ id: "known", guideSection: "concepts", guideOrder: 1 }),
      post({ id: "typo", guideSection: "concpets", guideOrder: 1 }),
      post({ id: "none", guideSection: undefined }),
    ];
    const grouped = groupChapters(posts, series);
    const last = grouped[grouped.length - 1];
    expect(last.section.key).toBe("__other");
    expect(last.chapters.map((c) => c.id)).toEqual(["typo", "none"]);
  });

  it("sorts chapters missing guideOrder after ordered ones, then by title", () => {
    const posts = [
      post({ id: "b", title: "B", guideSection: "concepts" }),
      post({ id: "a", title: "A", guideSection: "concepts" }),
      post({ id: "z", title: "Z", guideSection: "concepts", guideOrder: 1 }),
    ];
    const grouped = groupChapters(posts, series);
    expect(grouped[0].chapters.map((c) => c.id)).toEqual(["z", "a", "b"]);
  });

  it("omits sections that have no chapters", () => {
    const posts = [post({ id: "1", guideSection: "problems", guideOrder: 1 })];
    expect(groupChapters(posts, series).map((g) => g.section.key)).toEqual(["problems"]);
  });
});

describe("prevNext", () => {
  const posts = [
    post({ id: "1", slug: "s1", guideSection: "concepts", guideOrder: 1 }),
    post({ id: "2", slug: "s2", guideSection: "concepts", guideOrder: 2 }),
    post({ id: "3", slug: "s3", guideSection: "problems", guideOrder: 1 }),
  ];
  const flat = flattenChapters(groupChapters(posts, series));

  it("walks across section boundaries", () => {
    expect(prevNext(flat, "s2")).toEqual({ prev: flat[0], next: flat[2] });
  });

  it("returns undefined at the edges and for unknown slugs", () => {
    expect(prevNext(flat, "s1").prev).toBeUndefined();
    expect(prevNext(flat, "s3").next).toBeUndefined();
    expect(prevNext(flat, "nope")).toEqual({});
  });
});
