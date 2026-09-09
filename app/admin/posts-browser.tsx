"use client";

import { Button } from "@/components/ui/button";
import {
  countPosts,
  datasetFor,
  filterAndSortPosts,
  type AdminPostsQuery,
} from "@/lib/admin-posts";
import type { UnifiedPost } from "@/lib/posts";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { FilterSheet } from "./filter-sheet";
import { PostsQueryProvider, usePostsQuery } from "./posts-query";
import { PostsTable } from "./posts-table";
import { SearchInput } from "./search-input";

/**
 * The whole posts screen, driven from one copy of the data.
 *
 * `UnifiedPost` is a list row — no body, no content — so the full active and
 * trash sets are about 15KB of payload for this repo, and the loader already
 * had to read both of them anyway to produce the counters. Handing them over
 * once buys every filter, sort and keystroke for free, where each used to be a
 * round trip that re-queried Supabase for the same rows.
 */
export function PostsBrowser({
  active,
  trash,
  initialQuery,
}: {
  active: UnifiedPost[];
  trash: UnifiedPost[];
  initialQuery: AdminPostsQuery;
}) {
  return (
    <PostsQueryProvider initialQuery={initialQuery}>
      <Browser active={active} trash={trash} />
    </PostsQueryProvider>
  );
}

function Browser({
  active,
  trash,
}: {
  active: UnifiedPost[];
  trash: UnifiedPost[];
}) {
  const { query } = usePostsQuery();

  // Counts are absolute — each is how many posts a view holds regardless of
  // which one is open — so they only change when the data does, not the query.
  const counts = useMemo(() => countPosts(active, trash), [active, trash]);
  const dataset = datasetFor(query.view, active, trash);
  const posts = useMemo(
    () => filterAndSortPosts(dataset, query),
    [dataset, query],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">posts</h1>
        <div className="flex items-center gap-2">
          {/* Phone only. Desktop filters from the sidebar below, where the
              counts are worth keeping on screen. */}
          <FilterSheet counts={counts} />
          {/* No type picker here: the editor's own Type select covers all four
              types, so choosing one up front only added a click. */}
          <Button asChild>
            <Link href="/admin/edit/new">
              <PlusIcon className="w-4 h-4 mr-2" />
              New
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <AdminSidebar counts={counts} />
        <div className="min-w-0 flex-1 space-y-4">
          <SearchInput />
          <PostsTable
            posts={posts}
            query={query}
            isTrash={query.view === "trash"}
            total={dataset.length}
          />
        </div>
      </div>
    </>
  );
}
