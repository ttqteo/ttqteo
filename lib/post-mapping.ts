import type { BlogMdxFrontmatter } from "@/lib/markdown";
import type { PostType, UnifiedPost } from "@/lib/posts";
import { stringToDate } from "@/lib/utils";

const ALLOWED_TYPES: PostType[] = ["post", "reading", "paper", "guide"];

export const normalizeType = (t: unknown): PostType =>
  ALLOWED_TYPES.includes(t as PostType) ? (t as PostType) : "post";

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
