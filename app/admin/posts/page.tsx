import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAllPosts } from "@/lib/posts";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminTabs } from "../admin-tabs";
import { PostsList } from "./posts-list";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function AdminPostsPage({ searchParams }: PageProps) {
  const user = await getUser();
  if (!user) redirect("/admin");

  const admin = await isAdmin();
  if (!admin) redirect("/admin");

  const { view } = await searchParams;
  const isTrash = view === "trash";

  const posts = await getAllPosts({ view: isTrash ? "trash" : "active" });

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">posts</h1>
          <AdminTabs isTrash={isTrash} />
        </div>
        {!isTrash && (
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
        )}
      </div>

      <PostsList posts={posts} isTrash={isTrash} />
    </div>
  );
}
