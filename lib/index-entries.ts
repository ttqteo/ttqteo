import type { IndexEntry } from "@/components/portfolio/IndexTable";
import type { UnifiedPost } from "@/lib/posts";
import { hrefForPost, parseTags } from "@/lib/tags";

const DAY = 24 * 60 * 60 * 1000;
/** Below this, an edit is just a typo fix and not worth flagging in the list. */
const SIGNIFICANT_EDIT = 7 * DAY;
const RECENT_EDIT = 30 * DAY;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Shared post → row mapping for `/blog` and `/tags/[tag]`, so the two listings
 * can't drift apart on date formatting or the "recently updated" dot.
 */
export function toIndexEntry(post: UnifiedPost, now: number = Date.now()): IndexEntry {
  const created = new Date(post.createdAt);
  const updatedTs = new Date(post.updatedAt).getTime();
  const significantlyUpdated = updatedTs - created.getTime() >= SIGNIFICANT_EDIT;

  return {
    year: shortDate(post.createdAt),
    groupYear: created.getFullYear(),
    title: post.title,
    description: post.description,
    href: hrefForPost(post),
    updatedLabel: significantlyUpdated ? shortDate(post.updatedAt) : undefined,
    updatedRecent: significantlyUpdated && now - updatedTs <= RECENT_EDIT,
    tags: parseTags(post.tags),
  };
}
