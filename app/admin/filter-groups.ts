import type { ViewKey } from "@/lib/admin-posts";

/**
 * Shared by the desktop sidebar and the phone sheet so the two cannot drift.
 *
 * The groups are visual grouping only — picking any option replaces the view,
 * so exactly one is ever active and no count depends on another.
 */
export const FILTER_GROUPS: { label: string; views: ViewKey[] }[] = [
  { label: "status", views: ["all", "published", "draft", "trash"] },
  { label: "type", views: ["article", "guide"] },
  { label: "source", views: ["supabase", "mdx"] },
];
