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
  | "article"
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
  page: number;
};

export const VIEWS: ViewKey[] = [
  "all",
  "published",
  "draft",
  "trash",
  "article",
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
  page: 1,
};

export const PAGE_SIZE = 50;

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
    page: parsePage(one("page")),
  };
}

/**
 * Digits only and at least 1; anything else (missing, "0", "-1", "abc",
 * "2.5") lands on page 1. The page count isn't known here, so clamping the
 * upper end happens in `paginate` instead.
 */
function parsePage(raw: string | undefined): number {
  if (raw && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1) return n;
  }
  return 1;
}

/** Serializes back to a query string, omitting anything still at its default. */
export function buildQueryString(query: Partial<AdminPostsQuery>): string {
  const params = new URLSearchParams();
  for (const key of ["view", "sort", "dir", "q"] as const) {
    const value = query[key];
    if (value && value !== DEFAULT_QUERY[key]) params.set(key, value);
  }
  if (query.page && query.page > DEFAULT_QUERY.page) {
    params.set("page", String(query.page));
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

/** Slices an already filtered and sorted list into one page. */
export function paginate<T>(
  items: T[],
  page: number,
  size = PAGE_SIZE,
): { items: T[]; page: number; pageCount: number; from: number; to: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const clamped = Math.min(pageCount, Math.max(1, page));
  const start = (clamped - 1) * size;
  const end = Math.min(items.length, start + size);
  return {
    items: items.slice(start, end),
    page: clamped,
    pageCount,
    from: items.length === 0 ? 0 : start + 1,
    to: items.length === 0 ? 0 : end,
  };
}

/**
 * The compact set of page numbers a pager shows: first, last, and a window
 * around the current page, with a single missing neighbour filled in and
 * wider gaps collapsed to "…".
 */
export function pageList(page: number, pageCount: number): (number | "…")[] {
  const clamp = (n: number) => Math.min(pageCount, Math.max(1, n));
  const candidates = [1, pageCount, page - 1, page, page + 1].map(clamp);
  const nums = Array.from(new Set(candidates)).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0) {
      const gap = n - nums[i - 1];
      if (gap === 2) result.push(n - 1);
      else if (gap > 2) result.push("…");
    }
    result.push(n);
  });
  return result;
}
