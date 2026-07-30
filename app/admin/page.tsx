import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseQuery } from "@/lib/admin-posts";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNavProvider } from "./admin-nav";
import { AdminSidebar, AdminSidebarSkeleton } from "./admin-sidebar";
import { LoginButton } from "./login-button";
import { PostsSection } from "./posts-section";
import { PostsSectionSkeleton } from "./posts-skeleton";
import { SearchInput } from "./search-input";
import { SyncMdxButton } from "./sync-mdx-button";

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
    <div className="max-w-6xl mx-auto pt-12 pb-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">posts</h1>
        <div className="flex items-center gap-2">
          <SyncMdxButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/admin/edit/new?type=post">Post</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/edit/new?type=note">Note</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/edit/new?type=reading">Reading</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/edit/new?type=paper">Paper</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AdminNavProvider>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* The sidebar keeps its counters on screen while a filter loads;
              only the table swaps for a skeleton. */}
          <Suspense fallback={<AdminSidebarSkeleton />}>
            <AdminSidebar query={query} />
          </Suspense>
          <div className="min-w-0 flex-1 space-y-4">
            <SearchInput query={query} />
            <Suspense fallback={<PostsSectionSkeleton />}>
              <PostsSection query={query} />
            </Suspense>
          </div>
        </div>
      </AdminNavProvider>
    </div>
  );
}
