import { isAdmin } from "@/lib/supabase-server";
import { PencilIcon, HomeIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";

interface AdminToolbarProps {
  editPostId?: string;
}

export async function AdminToolbar({ editPostId }: AdminToolbarProps) {
  const admin = await isAdmin();

  if (!admin) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-zinc-900 text-white text-sm border-b border-zinc-800">
      <div className="container mx-auto px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>dashboard</span>
          </Link>
          {editPostId && (
            <Link
              href={`/admin/edit/${editPostId}`}
              className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
              <span>Edit Post</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-xs">admin mode</span>•
          <Link
            href="/admin/edit/new"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors text-xs"
          >
            <span>+ new blog</span>
          </Link>
          •
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              <span>logout</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
