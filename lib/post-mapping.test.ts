import { describe, expect, it } from "vitest";
import { toUnifiedMdxPost } from "@/lib/post-mapping";
import type { BlogMdxFrontmatter } from "@/lib/markdown";
import { stringToDate } from "@/lib/utils";

function blog(
  overrides: Partial<BlogMdxFrontmatter> & { slug?: string } = {},
): BlogMdxFrontmatter & { slug: string } {
  return {
    slug: "hello",
    title: "Hello",
    description: "một mô tả",
    date: "2026-01-04",
    authors: [],
    cover: "",
    isPublished: true,
    tags: "",
    ...overrides,
  };
}

describe("toUnifiedMdxPost", () => {
  it("carries the frontmatter description into the listing", () => {
    expect(toUnifiedMdxPost(blog()).description).toBe("một mô tả");
  });

  it("treats a blank description as absent", () => {
    expect(toUnifiedMdxPost(blog({ description: "" })).description).toBeUndefined();
    expect(toUnifiedMdxPost(blog({ description: "   " })).description).toBeUndefined();
  });

  it("uses the declared `updated` date as updatedAt", () => {
    const post = toUnifiedMdxPost(blog({ updated: "2026-02-13" }));
    expect(post.updatedAt).toBe(stringToDate("2026-02-13").toISOString());
  });

  it("reports no edit at all when `updated` is absent", () => {
    // A git commit date would mark every post as edited forever, because
    // reformatting or flipping `isPublished` also touches the file.
    const post = toUnifiedMdxPost(blog());
    expect(post.updatedAt).toBe(post.createdAt);
  });

  it("ignores a blank `updated` field", () => {
    const post = toUnifiedMdxPost(blog({ updated: "  " }));
    expect(post.updatedAt).toBe(post.createdAt);
  });

  it("keeps the declared post type and defaults unknown ones to `post`", () => {
    expect(toUnifiedMdxPost(blog({ type: "reading" })).type).toBe("reading");
    expect(
      toUnifiedMdxPost(blog({ type: "nonsense" as never })).type,
    ).toBe("post");
  });

  it("marks the row as coming from MDX", () => {
    const post = toUnifiedMdxPost(blog({ slug: "2026/01/04/x" }));
    expect(post.source).toBe("mdx");
    expect(post.slug).toBe("2026/01/04/x");
    expect(post.id).toBe("mdx-2026/01/04/x");
  });
});
