import { getAllBlogs } from "@/lib/markdown";
import { getGitFileMeta } from "@/lib/git-meta";
import { supabasePublic } from "@/lib/supabase-public";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { stringToDate } from "@/lib/utils";
import path from "path";

export type PostSource = "mdx" | "supabase";
export type PostType = "post" | "note" | "reading" | "paper" | "guide";

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

const ALLOWED_TYPES: PostType[] = ["post", "note", "reading", "paper", "guide"];
const normalizeType = (t: unknown): PostType =>
  ALLOWED_TYPES.includes(t as PostType) ? (t as PostType) : "post";

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
    type: hasType ? normalizeType(r.type) : "post",
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

export function extractTocFromHtml(html: string) {
  const regex = /<h([2-4])[^>]*?>([\s\S]*?)<\/h\1>/gi;
  const out: { level: number; text: string; href: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const level = parseInt(m[1], 10);
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    const slug = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    out.push({ level, text, href: `#${slug}` });
  }
  return out;
}

export function injectHeadingIds(html: string): string {
  return html.replace(
    /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_, level, attrs, inner) => {
      const text = String(inner).replace(/<[^>]+>/g, "").trim();
      const slug = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      const hasId = / id\s*=\s*["'][^"']*["']/.test(attrs);
      const newAttrs = hasId ? attrs : `${attrs} id="${slug}"`;
      return `<h${level}${newAttrs}>${inner}</h${level}>`;
    }
  );
}

export async function getMdxPosts(): Promise<UnifiedPost[]> {
  const blogs = await getAllBlogs();
  return Promise.all(
    blogs.map(async (b) => {
      const createdIso = stringToDate(b.date).toISOString();
      const absPath = path.join(
        process.cwd(),
        "/contents/blogs/",
        `${b.slug}.mdx`,
      );
      const meta = await getGitFileMeta(absPath);
      return {
        id: `mdx-${b.slug}`,
        slug: b.slug,
        title: b.title,
        description: undefined,
        type: normalizeType(b.type),
        isPublished: !!b.isPublished,
        source: "mdx" as const,
        createdAt: createdIso,
        updatedAt: meta.lastCommitIso ?? createdIso,
        deletedAt: null,
        tags: (b as { tags?: string }).tags,
      };
    }),
  );
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
