import { GUIDE_SERIES } from "@/lib/guides";
import type { UnifiedPost } from "@/lib/posts";

export type TagCount = { tag: string; count: number };

/**
 * Tags are authored as a free-form comma string in MDX frontmatter and in the
 * admin editor, so `"AWS, fcj"` and `"aws,fcj"` must land on the same tag page.
 * Normalising here is what makes `/tags/[tag]` a stable URL.
 */
export function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/** Busiest tag first, ties broken alphabetically. */
export function countTagLists(lists: string[][]): TagCount[] {
  const counts = new Map<string, number>();
  for (const tags of lists) {
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.tag.localeCompare(b.tag)));
}

export function countTags(posts: UnifiedPost[]): TagCount[] {
  return countTagLists(posts.map((post) => parseTags(post.tags)));
}

export function postsWithTag(posts: UnifiedPost[], tag: string): UnifiedPost[] {
  const wanted = tag.trim().toLowerCase();
  return posts.filter((post) => parseTags(post.tags).includes(wanted));
}

/**
 * A tag page mixes post types, and guide chapters have one canonical URL under
 * their series hub — `/blog/<slug>` only redirects there.
 */
export function hrefForPost(post: UnifiedPost): string {
  if (post.type === "guide") {
    const tags = parseTags(post.tags);
    const series = GUIDE_SERIES.find((s) => tags.includes(s.tag));
    if (series) return `/series/${series.tag}/${post.slug}`;
  }
  return `/blog/${post.slug}`;
}
