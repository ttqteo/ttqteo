import type { UnifiedPost } from "@/lib/posts";

/**
 * One view at a time, not a stack of filters.
 *
 * Filters used to AND together in the URL, which meant clicking any of them
 * quietly shrank every other counter — and left combinations like
 * "type=paper + source=mdx" that resolve to nothing. A single view keeps every
 * count absolute and stable: what the sidebar says is what you get.
 */
export type ViewKey =
  | "all"
  | "published"
  | "draft"
  | "trash"
  | "post"
  | "reading"
  | "paper"
  | "guide"
  | "supabase"
  | "mdx";

export type SortKey = "edited" | "created" | "title";
export type SortDir = "asc" | "desc";

export type AdminPostsQuery = {
  view: ViewKey;
  sort: SortKey;
  dir: SortDir;
  q: string;
};

export const VIEWS: ViewKey[] = [
  "all",
  "published",
  "draft",
  "trash",
  "post",
  "reading",
  "paper",
  "guide",
  "supabase",
  "mdx",
];

const SORTS: SortKey[] = ["edited", "created", "title"];

export const DEFAULT_QUERY: AdminPostsQuery = {
  view: "all",
  sort: "edited",
  dir: "desc",
  q: "",
};

function pick<T extends string>(allowed: T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Query params are user-editable, so anything unrecognized falls back to the default. */
export function parseQuery(
  params: Record<string, string | string[] | undefined>,
): AdminPostsQuery {
  const one = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  // `status`/`type`/`source` are the previous multi-filter params — honored so
  // links already sitting in a tab still land somewhere sensible.
  const legacy = [one("status"), one("type"), one("source")].find(
    (v) => v && v !== "all" && VIEWS.includes(v as ViewKey),
  );

  return {
    view: pick(VIEWS, one("view") ?? legacy, DEFAULT_QUERY.view),
    sort: pick(SORTS, one("sort"), DEFAULT_QUERY.sort),
    dir: one("dir") === "asc" ? "asc" : "desc",
    q: (one("q") ?? "").trim(),
  };
}

/** Serializes back to a query string, omitting anything still at its default. */
export function buildQueryString(query: Partial<AdminPostsQuery>): string {
  const params = new URLSearchParams();
  for (const key of ["view", "sort", "dir", "q"] as const) {
    const value = query[key];
    if (value && value !== DEFAULT_QUERY[key]) params.set(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Trash lives in its own dataset; every other view reads the active one. */
export function datasetFor(
  view: ViewKey,
  active: UnifiedPost[],
  trash: UnifiedPost[],
): UnifiedPost[] {
  return view === "trash" ? trash : active;
}

function inView(post: UnifiedPost, view: ViewKey): boolean {
  switch (view) {
    case "all":
    case "trash":
      return true;
    case "published":
      return post.isPublished;
    case "draft":
      return !post.isPublished;
    case "supabase":
    case "mdx":
      return post.source === view;
    default:
      return post.type === view;
  }
}

/**
 * Counts are absolute: each one is how many posts that view holds, regardless
 * of which view is currently open. Search deliberately doesn't feed into them —
 * a counter that moved while you typed would be back to lying about clicks.
 */
export function countPosts(
  active: UnifiedPost[],
  trash: UnifiedPost[],
): Record<ViewKey, number> {
  const counts = {} as Record<ViewKey, number>;
  for (const view of VIEWS) {
    const dataset = datasetFor(view, active, trash);
    counts[view] = dataset.reduce((n, p) => (inView(p, view) ? n + 1 : n), 0);
  }
  return counts;
}

function compare(a: UnifiedPost, b: UnifiedPost, sort: SortKey): number {
  if (sort === "title") return a.title.localeCompare(b.title);
  const field = sort === "created" ? "createdAt" : "updatedAt";
  return new Date(a[field]).getTime() - new Date(b[field]).getTime();
}

/** `posts` must already be the dataset for the view (see `datasetFor`). */
export function filterAndSortPosts(
  posts: UnifiedPost[],
  query: AdminPostsQuery,
): UnifiedPost[] {
  const q = query.q.toLowerCase();
  const result = posts.filter((p) => {
    if (!inView(p, query.view)) return false;
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  });
  result.sort((a, b) => {
    const c = compare(a, b, query.sort);
    return query.dir === "asc" ? c : -c;
  });
  return result;
}

/**
 * Bulk actions hit the posts API, which only knows about Supabase rows. MDX
 * posts live in files, so select-all must skip them rather than silently
 * pretend they were included.
 */
export function selectableIds(posts: UnifiedPost[]): string[] {
  return posts.filter((p) => p.source === "supabase").map((p) => p.id);
}

export function isSelectable(post: UnifiedPost): boolean {
  return post.source === "supabase";
}
