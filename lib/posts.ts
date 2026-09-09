import { getAllBlogs } from "@/lib/markdown";
import { normalizeType, toUnifiedMdxPost } from "@/lib/post-mapping";
import { supabasePublic } from "@/lib/supabase-public";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type PostSource = "mdx" | "supabase";
/**
 * Two kinds, because only two behave differently: an article stands alone,
 * a guide belongs to a series and carries its section and order.
 *
 * `post`, `reading` and `paper` used to be separate values, but nothing ever
 * branched on the difference between reading and paper, and all three are
 * still read back as `article` — see `normalizeType`.
 */
export type PostType = "article" | "guide";

export type UnifiedPost = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: PostType;
  isPublished: boolean;
  source: PostSource;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  tags?: string;
  guideSection?: string;
  guideOrder?: number;
};

export type PostsView = "active" | "trash";

export type GetAllPostsOptions = {
  view?: PostsView;
  includeMdx?: boolean;
};

const BASE_COLUMNS = "id, slug, title, description, is_published, created_at, updated_at, deleted_at";

type PostRowQuery = (
  columns: string
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * Runs `runQuery` with progressively fewer optional columns, so the site keeps
 * working against a DB that predates the `type` / `tags` migrations.
 */
async function selectPostRows(runQuery: PostRowQuery): Promise<UnifiedPost[]> {
  let { data, error } = await runQuery(
    `${BASE_COLUMNS}, type, tags, guide_section, guide_order`
  );
  let hasType = true;
  let hasTags = true;
  let hasGuide = true;
  if (error && /guide_(section|order)/i.test(error.message)) {
    hasGuide = false;
    ({ data, error } = await runQuery(`${BASE_COLUMNS}, type, tags`));
  }
  if (error && /tags/i.test(error.message)) {
    hasTags = false;
    ({ data, error } = await runQuery(
      hasGuide ? `${BASE_COLUMNS}, type, guide_section, guide_order` : `${BASE_COLUMNS}, type`
    ));
  }
  if (error && /'?type'? column|column .*type.* does not exist/i.test(error.message)) {
    hasType = false;
    ({ data, error } = await runQuery(hasTags ? `${BASE_COLUMNS}, tags` : BASE_COLUMNS));
  }
  if (error) {
    console.error("[posts] supabase error:", error.message);
    return [];
  }

  const rows = (data || []) as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    title: (r.title as string) || "Untitled",
    description: (r.description as string | null) ?? undefined,
    type: hasType ? normalizeType(r.type) : "article",
    isPublished: !!r.is_published,
    source: "supabase" as const,
    createdAt: (r.created_at as string) || (r.updated_at as string) || new Date().toISOString(),
    updatedAt: (r.updated_at as string) || (r.created_at as string) || new Date().toISOString(),
    deletedAt: (r.deleted_at as string | null) ?? null,
    tags: hasTags ? ((r.tags as string | null) ?? undefined) : undefined,
    guideSection: hasGuide
      ? ((r.guide_section as string | null) ?? undefined)
      : undefined,
    // numeric column: PostgREST tra ve string, luon boc Number()
    guideOrder:
      hasGuide && r.guide_order != null ? Number(r.guide_order) : undefined,
  }));
}

export async function getSupabasePosts(view: PostsView = "active"): Promise<UnifiedPost[]> {
  const supabase = await createSupabaseServerClient();

  return selectPostRows((columns) => {
    const q = supabase
      .from("blogs")
      .select(columns)
      .order("updated_at", { ascending: false });
    return view === "trash" ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  });
}

/**
 * Published posts read through the cookie-free client, so pages using it stay
 * statically renderable. Admin views must keep using `getSupabasePosts()`.
 */
export async function getPublishedSupabasePosts(): Promise<UnifiedPost[]> {
  return selectPostRows((columns) =>
    supabasePublic
      .from("blogs")
      .select(columns)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
  );
}

export type SupabasePostFull = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  isPublished: boolean;
  type: PostType;
  createdAt: string;
  updatedAt: string;
  tags: string | null;
  guideSection: string | null;
  guideOrder: number | null;
};

export async function getSupabasePostBySlug(slug: string): Promise<SupabasePostFull | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  return mapPostRow(data, error);
}

/**
 * Published-only lookup through the cookie-free client. Public pages should try
 * this first and only fall back to `getSupabasePostBySlug()` (which reads
 * cookies, forcing a dynamic render) when previewing an unpublished draft.
 */
export async function getPublishedSupabasePostBySlug(
  slug: string
): Promise<SupabasePostFull | null> {
  const { data, error } = await supabasePublic
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("deleted_at", null)
    .maybeSingle();

  return mapPostRow(data, error);
}

function mapPostRow(
  data: unknown,
  error: { message: string } | null
): SupabasePostFull | null {
  if (error || !data) return null;

  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: (r.title as string) || "Untitled",
    description: (r.description as string | null) ?? null,
    content: (r.content as string) || "",
    isPublished: !!r.is_published,
    type: normalizeType(r.type),
    createdAt: (r.created_at as string) || (r.updated_at as string) || new Date().toISOString(),
    updatedAt: (r.updated_at as string) || (r.created_at as string) || new Date().toISOString(),
    tags: (r.tags as string | null) ?? null,
    guideSection: (r.guide_section as string | null) ?? null,
    guideOrder: r.guide_order != null ? Number(r.guide_order) : null,
  };
}

export async function getMdxPosts(): Promise<UnifiedPost[]> {
  const blogs = await getAllBlogs();
  return blogs.map(toUnifiedMdxPost);
}

export async function getAllPosts(opts: GetAllPostsOptions = {}): Promise<UnifiedPost[]> {
  const { view = "active", includeMdx = true } = opts;
  const dbPosts = await getSupabasePosts(view);
  const mdxPosts = view === "trash" || !includeMdx ? [] : await getMdxPosts();

  // MDX is source of truth: if a slug exists in both, drop the DB copy.
  const mdxSlugs = new Set(mdxPosts.map((p) => p.slug));
  const dedupedDb = dbPosts.filter((p) => !mdxSlugs.has(p.slug));

  return [...dedupedDb, ...mdxPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Published DB posts + published MDX posts, without touching `cookies()`.
 * This is what public listing pages (`/`, `/blog`) should use.
 */
export async function getPublishedPosts(): Promise<UnifiedPost[]> {
  const [dbPosts, mdxPosts] = await Promise.all([
    getPublishedSupabasePosts(),
    getMdxPosts(),
  ]);

  const publishedMdx = mdxPosts.filter((p) => p.isPublished);

  // MDX is source of truth: if a slug exists in both, drop the DB copy.
  const mdxSlugs = new Set(publishedMdx.map((p) => p.slug));
  const dedupedDb = dbPosts.filter((p) => !mdxSlugs.has(p.slug));

  return [...dedupedDb, ...publishedMdx].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
