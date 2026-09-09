"use client";

import { buildQueryString, type ViewKey } from "@/lib/admin-posts";
import { FILTER_GROUPS } from "./filter-groups";
import { FilterLink } from "./filter-link";
import { usePostsQuery } from "./posts-query";

/**
 * Desktop keeps the sidebar: the counts are worth having on screen while you
 * work, and there is room for them. A phone gets the same options behind the
 * button next to New instead — ten always-visible rows was more chrome than a
 * control you touch occasionally deserves.
 */
export function AdminSidebar({ counts }: { counts: Record<ViewKey, number> }) {
  const { query, setQuery } = usePostsQuery();

  return (
    <aside className="hidden lg:block w-44 shrink-0 space-y-5 lg:sticky lg:top-14 lg:self-start">
      {FILTER_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1.5">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.views.map((view) => (
              <li key={view}>
                <FilterLink
                  href={`/admin${buildQueryString({ ...query, view })}`}
                  label={view}
                  count={counts[view]}
                  active={query.view === view}
                  onSelect={() => setQuery({ view })}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
