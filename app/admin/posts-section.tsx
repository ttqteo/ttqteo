import {
  datasetFor,
  filterAndSortPosts,
  type AdminPostsQuery,
} from "@/lib/admin-posts";
import { PendingSwap } from "./admin-nav";
import { loadAdminPosts } from "./posts-data";
import { PostsSectionSkeleton } from "./posts-skeleton";
import { PostsTable } from "./posts-table";

export async function PostsSection({ query }: { query: AdminPostsQuery }) {
  const { active, trash } = await loadAdminPosts();
  const isTrash = query.view === "trash";
  const dataset = datasetFor(query.view, active, trash);

  return (
    <PendingSwap fallback={<PostsSectionSkeleton />}>
      <PostsTable
        posts={filterAndSortPosts(dataset, query)}
        query={query}
        isTrash={isTrash}
        total={dataset.length}
      />
    </PendingSwap>
  );
}
