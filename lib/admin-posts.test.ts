import { describe, expect, it } from "vitest";
import {
  buildQueryString,
  countPosts,
  datasetFor,
  filterAndSortPosts,
  parseQuery,
  selectableIds,
  DEFAULT_QUERY,
  type AdminPostsQuery,
} from "@/lib/admin-posts";
import type { UnifiedPost } from "@/lib/posts";

function post(overrides: Partial<UnifiedPost> & { id: string }): UnifiedPost {
  return {
    slug: `slug-${overrides.id}`,
    title: `Post ${overrides.id}`,
    type: "post",
    isPublished: true,
    source: "supabase",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const query = (overrides: Partial<AdminPostsQuery> = {}): AdminPostsQuery => ({
  ...DEFAULT_QUERY,
  ...overrides,
});

describe("parseQuery", () => {
  it("falls back to defaults for unknown values", () => {
    expect(parseQuery({ view: "nope", sort: "banana", dir: "sideways" })).toEqual(
      DEFAULT_QUERY,
    );
  });

  it("reads recognized values and trims the search term", () => {
    expect(parseQuery({ view: "draft", sort: "title", dir: "asc", q: "  hi " })).toEqual({
      view: "draft",
      sort: "title",
      dir: "asc",
      q: "hi",
    });
  });

  it("takes the first value when a param repeats", () => {
    expect(parseQuery({ view: ["draft", "published"] }).view).toBe("draft");
  });

  it("maps the retired status/type/source params onto a view", () => {
    expect(parseQuery({ status: "draft" }).view).toBe("draft");
    expect(parseQuery({ type: "reading" }).view).toBe("reading");
    expect(parseQuery({ source: "mdx" }).view).toBe("mdx");
  });

  it("ignores legacy params that were already 'all'", () => {
    expect(parseQuery({ status: "all", type: "all" }).view).toBe("all");
  });

  it("prefers an explicit view over a legacy param", () => {
    expect(parseQuery({ view: "trash", status: "draft" }).view).toBe("trash");
  });
});

describe("buildQueryString", () => {
  it("omits defaults", () => {
    expect(buildQueryString(DEFAULT_QUERY)).toBe("");
  });

  it("keeps only non-default values", () => {
    expect(buildQueryString(query({ view: "draft", sort: "title" }))).toBe(
      "?view=draft&sort=title",
    );
  });
});

describe("countPosts", () => {
  const active = [
    post({ id: "1", isPublished: true, type: "post", source: "supabase" }),
    post({ id: "2", isPublished: false, type: "note", source: "supabase" }),
    post({ id: "3", isPublished: true, type: "reading", source: "mdx" }),
  ];
  const trash = [post({ id: "4", deletedAt: "2026-02-01T00:00:00.000Z" })];

  it("counts each view independently", () => {
    expect(countPosts(active, trash)).toEqual({
      all: 3,
      published: 2,
      draft: 1,
      trash: 1,
      post: 1,
      note: 1,
      reading: 1,
      paper: 0,
      supabase: 2,
      mdx: 1,
    });
  });

  it("does not depend on which view is open", () => {
    // The whole point of dropping stacked filters: counts never move.
    expect(countPosts(active, trash)).toEqual(countPosts(active, trash));
  });
});

describe("datasetFor", () => {
  const active = [post({ id: "1" })];
  const trash = [post({ id: "2" }), post({ id: "3" })];

  it("reads the trash dataset only for the trash view", () => {
    expect(datasetFor("trash", active, trash)).toBe(trash);
    expect(datasetFor("all", active, trash)).toBe(active);
    expect(datasetFor("mdx", active, trash)).toBe(active);
  });
});

describe("filterAndSortPosts", () => {
  const posts = [
    post({ id: "a", title: "Banana", isPublished: true, type: "post", source: "supabase", updatedAt: "2026-03-01T00:00:00.000Z", createdAt: "2026-01-03T00:00:00.000Z" }),
    post({ id: "b", title: "apple", isPublished: false, type: "note", source: "supabase", updatedAt: "2026-05-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z" }),
    post({ id: "c", title: "Cherry", isPublished: true, type: "reading", source: "mdx", updatedAt: "2026-04-01T00:00:00.000Z", createdAt: "2026-01-02T00:00:00.000Z" }),
  ];
  const ids = (result: UnifiedPost[]) => result.map((p) => p.id);

  it("selects by status view", () => {
    expect(ids(filterAndSortPosts(posts, query({ view: "draft" })))).toEqual(["b"]);
    expect(ids(filterAndSortPosts(posts, query({ view: "published" })))).toEqual(["c", "a"]);
  });

  it("selects by type and source view", () => {
    expect(ids(filterAndSortPosts(posts, query({ view: "note" })))).toEqual(["b"]);
    expect(ids(filterAndSortPosts(posts, query({ view: "mdx" })))).toEqual(["c"]);
  });

  it("keeps everything for the all and trash views", () => {
    expect(ids(filterAndSortPosts(posts, query({ view: "all" })))).toEqual(["b", "c", "a"]);
    expect(ids(filterAndSortPosts(posts, query({ view: "trash" })))).toEqual(["b", "c", "a"]);
  });

  it("searches title and slug within the view, case-insensitively", () => {
    expect(ids(filterAndSortPosts(posts, query({ q: "BANA" })))).toEqual(["a"]);
    expect(ids(filterAndSortPosts(posts, query({ q: "slug-c" })))).toEqual(["c"]);
    expect(ids(filterAndSortPosts(posts, query({ view: "draft", q: "banana" })))).toEqual([]);
  });

  it("sorts by edited date, newest first by default", () => {
    expect(ids(filterAndSortPosts(posts, query()))).toEqual(["b", "c", "a"]);
    expect(ids(filterAndSortPosts(posts, query({ dir: "asc" })))).toEqual(["a", "c", "b"]);
  });

  it("sorts by created date", () => {
    expect(ids(filterAndSortPosts(posts, query({ sort: "created" })))).toEqual(["a", "c", "b"]);
  });

  it("sorts by title without letting case decide the order", () => {
    expect(ids(filterAndSortPosts(posts, query({ sort: "title", dir: "asc" })))).toEqual(["b", "a", "c"]);
  });

  it("leaves the input array untouched", () => {
    const original = [...posts];
    filterAndSortPosts(posts, query({ sort: "title" }));
    expect(posts).toEqual(original);
  });
});

describe("selectableIds", () => {
  it("returns only supabase ids, so bulk actions never target mdx files", () => {
    const posts = [
      post({ id: "a", source: "supabase" }),
      post({ id: "b", source: "mdx" }),
      post({ id: "c", source: "supabase" }),
    ];
    expect(selectableIds(posts)).toEqual(["a", "c"]);
  });
});
