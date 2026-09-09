import type { BlogMdxFrontmatter } from "@/lib/markdown";
import type { PostType, UnifiedPost } from "@/lib/posts";
import { stringToDate } from "@/lib/utils";

/**
 * The single place a stored type becomes a `PostType`, for both MDX
 * frontmatter and Supabase rows.
 *
 * `post`, `reading`, `paper` and `note` are the values written before the two
 * kinds were collapsed. Mapping them here means neither the database nor the
 * existing frontmatter has to be rewritten, and anything unrecognised is an
 * article rather than an error.
 */
const LEGACY_ARTICLE_TYPES = ["post", "reading", "paper", "note"];

export const normalizeType = (t: unknown): PostType => {
  if (t === "guide") return "guide";
  if (t === "article" || LEGACY_ARTICLE_TYPES.includes(t as string)) {
    return "article";
  }
  return "article";
};

/**
 * Frontmatter → listing row. Kept free of the Supabase clients in `lib/posts`
 * so it stays a pure, testable mapping.
 */
export function toUnifiedMdxPost(
  blog: BlogMdxFrontmatter & { slug: string },
): UnifiedPost {
  const createdIso = stringToDate(blog.date).toISOString();
  const updated = blog.updated?.trim();
  // An empty `description:` in frontmatter is "not written yet", not a subtitle.
  const description = blog.description?.trim() || undefined;

  return {
    id: `mdx-${blog.slug}`,
    slug: blog.slug,
    title: blog.title,
    description,
    type: normalizeType(blog.type),
    isPublished: !!blog.isPublished,
    source: "mdx",
    createdAt: createdIso,
    updatedAt: updated ? stringToDate(updated).toISOString() : createdIso,
    deletedAt: null,
    tags: blog.tags,
  };
}
