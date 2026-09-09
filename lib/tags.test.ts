import { describe, expect, it } from "vitest";
import {
  countTagLists,
  countTags,
  hrefForPost,
  parseTags,
  postsWithTag,
} from "@/lib/tags";
import type { UnifiedPost } from "@/lib/posts";

function post(overrides: Partial<UnifiedPost> & { id: string }): UnifiedPost {
  return {
    slug: `slug-${overrides.id}`,
    title: `Post ${overrides.id}`,
    type: "article",
    isPublished: true,
    source: "mdx",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tags: "",
    ...overrides,
  };
}

describe("parseTags", () => {
  it("splits a comma-separated frontmatter string", () => {
    expect(parseTags("aws, fcj")).toEqual(["aws", "fcj"]);
  });

  it("lowercases and trims so `AWS ` and `aws` are one tag", () => {
    expect(parseTags(" AWS ,Java")).toEqual(["aws", "java"]);
  });

  it("drops empty segments from trailing or doubled commas", () => {
    expect(parseTags("aws,,java,")).toEqual(["aws", "java"]);
  });

  it("dedupes repeats within one post", () => {
    expect(parseTags("aws, AWS")).toEqual(["aws"]);
  });

  it("returns an empty array for missing or blank tags", () => {
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("")).toEqual([]);
    expect(parseTags("  ")).toEqual([]);
  });
});

describe("countTags", () => {
  it("counts each tag across posts", () => {
    const counts = countTags([
      post({ id: "1", tags: "aws, java" }),
      post({ id: "2", tags: "aws" }),
    ]);
    expect(counts).toEqual([
      { tag: "aws", count: 2 },
      { tag: "java", count: 1 },
    ]);
  });

  it("sorts by count descending, then alphabetically", () => {
    const counts = countTags([
      post({ id: "1", tags: "zeta, alpha" }),
      post({ id: "2", tags: "zeta, alpha" }),
      post({ id: "3", tags: "beta" }),
    ]);
    expect(counts).toEqual([
      { tag: "alpha", count: 2 },
      { tag: "zeta", count: 2 },
      { tag: "beta", count: 1 },
    ]);
  });

  it("ignores posts with no tags", () => {
    expect(countTags([post({ id: "1" }), post({ id: "2", tags: "aws" })])).toEqual([
      { tag: "aws", count: 1 },
    ]);
  });
});

describe("countTagLists", () => {
  it("counts already-parsed tag lists with the same ordering rule", () => {
    expect(
      countTagLists([
        ["zeta", "alpha"],
        ["zeta", "alpha"],
        ["beta"],
      ]),
    ).toEqual([
      { tag: "alpha", count: 2 },
      { tag: "zeta", count: 2 },
      { tag: "beta", count: 1 },
    ]);
  });
});

describe("postsWithTag", () => {
  it("returns only posts carrying the tag", () => {
    const a = post({ id: "1", tags: "aws" });
    const b = post({ id: "2", tags: "java" });
    expect(postsWithTag([a, b], "aws")).toEqual([a]);
  });

  it("matches regardless of the casing used in the query or the post", () => {
    const a = post({ id: "1", tags: "AWS" });
    expect(postsWithTag([a], "aws")).toEqual([a]);
    expect(postsWithTag([a], "AWS")).toEqual([a]);
  });

  it("does not match a tag that is only a substring of another", () => {
    const a = post({ id: "1", tags: "javascript" });
    expect(postsWithTag([a], "java")).toEqual([]);
  });
});

describe("hrefForPost", () => {
  it("links a normal post to /blog", () => {
    expect(hrefForPost(post({ id: "1", slug: "hello" }))).toBe("/blog/hello");
  });

  it("links a guide chapter to its series hub, not /blog", () => {
    const chapter = post({
      id: "1",
      slug: "jvm-memory",
      type: "guide",
      tags: "java-core",
    });
    expect(hrefForPost(chapter)).toBe("/series/java-core/jvm-memory");
  });

  it("falls back to /blog for a guide with no known series tag", () => {
    const orphan = post({ id: "1", slug: "orphan", type: "guide", tags: "misc" });
    expect(hrefForPost(orphan)).toBe("/blog/orphan");
  });
});
