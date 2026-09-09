import { parseQuery, type AdminPostsQuery } from "@/lib/admin-posts";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { Suspense } from "react";
import { LoginButton } from "./login-button";
import { PostsBrowser } from "./posts-browser";
import { loadAdminPosts } from "./posts-data";
import { PostsBrowserSkeleton } from "./posts-skeleton";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const user = await getUser();

  if (!user) {
    return (
      <div className="max-w-[720px] mx-auto px-4">
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <h1 className="font-serif text-4xl">ttqteo</h1>
            <p className="font-mono text-xs text-muted-foreground mt-3 tracking-widest uppercase">
              private area
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    );
  }

  const admin = await isAdmin();
  if (!admin) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold">Unauthorized</h1>
          <p className="text-muted-foreground mt-2">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const query = parseQuery(await searchParams);

  return (
    // Extra top padding because this page hides the site navbar: without it the
    // heading starts 36px under the toolbar, tighter than every other page.
    <div className="max-w-6xl mx-auto pt-12 pb-8 px-2 sm:px-4 space-y-6">
      <Suspense fallback={<PostsBrowserSkeleton />}>
        <PostsBrowserLoader query={query} />
      </Suspense>
    </div>
  );
}

/**
 * Reads every post once and hands the whole set to the client, which then does
 * its own filtering. The counters needed the full list anyway, so this is the
 * same query the page always ran — it just stops running again per filter.
 */
async function PostsBrowserLoader({ query }: { query: AdminPostsQuery }) {
  const { active, trash } = await loadAdminPosts();
  return <PostsBrowser active={active} trash={trash} initialQuery={query} />;
}
