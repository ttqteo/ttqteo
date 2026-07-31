import {
  buildQueryString,
  countPosts,
  type AdminPostsQuery,
  type ViewKey,
} from "@/lib/admin-posts";
import { FilterLink } from "./filter-link";
import { loadAdminPosts } from "./posts-data";

const GROUPS: { label: string; views: ViewKey[] }[] = [
  { label: "status", views: ["all", "published", "draft", "trash"] },
  { label: "type", views: ["post", "reading", "paper", "guide"] },
  { label: "source", views: ["supabase", "mdx"] },
];

/**
 * The groups are visual grouping only — picking any row replaces the view, so
 * exactly one row is ever active and no count depends on another.
 */
export async function AdminSidebar({ query }: { query: AdminPostsQuery }) {
  const { active, trash } = await loadAdminPosts();
  const counts = countPosts(active, trash);

  return (
    <aside className="w-full lg:w-44 shrink-0 space-y-5 lg:sticky lg:top-14 lg:self-start">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1.5">
            {group.label}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 lg:block lg:space-y-0.5">
            {group.views.map((view) => (
              <li key={view}>
                <FilterLink
                  href={`/admin${buildQueryString({ ...query, view })}`}
                  label={view}
                  count={counts[view]}
                  active={query.view === view}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

export function AdminSidebarSkeleton() {
  return (
    <aside className="w-full lg:w-44 shrink-0 space-y-5">
      {[4, 4, 2].map((rows, group) => (
        <div key={group}>
          <div className="h-2.5 w-12 rounded bg-muted animate-pulse mb-2.5" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 lg:block lg:space-y-1.5">
            {Array.from({ length: rows }).map((_, i) => (
              <div
                key={i}
                className="h-4 w-20 rounded bg-muted/60 animate-pulse lg:w-full"
              />
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
