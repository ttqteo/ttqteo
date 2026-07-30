"use client";

import { FileTextIcon, PencilIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AdminNavLink } from "@/components/admin-nav-link";
import { LogoutForm } from "@/components/admin/logout-form";

interface AdminToolbarProps {
  editPostId?: string;
}

export function AdminToolbar({ editPostId }: AdminToolbarProps) {
  // Rendered unconditionally and shown by CSS, not by state. `admin` resolves
  // only after /api/admin/me answers, so returning null until then left the bar
  // missing for a few hundred ms — while the head script had already reserved
  // its 36px. That mismatch is the flash on every load. `admin-toolbar` is
  // hidden by default and revealed by the same `html.is-admin` class that
  // reserves the space, so the two can't disagree.
  return (
    <div className="admin-toolbar fixed top-0 left-0 right-0 z-[60] h-9 bg-zinc-900 text-white text-sm border-b border-zinc-800">
      {/* Same box as the navbar — `sm:container px-2 w-[95vw]` for a shared left
          edge (`container px-4` put them ~15px apart), and `h-full` so
          `items-center` centres against the full 36px bar. With padding instead,
          the row was only as tall as its content and sat a couple of px high. */}
      <div className="sm:container px-2 mx-auto w-[95vw] h-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 hover:text-zinc-300 transition-colors bg-zinc-800/50 py-0.5 px-2 rounded-full border border-zinc-700/50 leading-none"
          >
            {/* Same crop problem as the navbar; the toolbar is always dark, so
                it only ever needs the light circle. */}
            <Image
              src="/images/logo-light-circle.png"
              width={16}
              height={16}
              alt="ttqteo"
              className="shrink-0"
            />
            <span className="font-semibold">ttqteo</span>
          </Link>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          {/* /admin is the post list now, so dashboard and posts are one item. */}
          <AdminNavLink href="/admin" exact>
            <FileTextIcon className="w-3.5 h-3.5" />
            <span>posts</span>
          </AdminNavLink>
          {editPostId && (
            <AdminNavLink href={`/admin/edit/${editPostId}`}>
              <PencilIcon className="w-3.5 h-3.5" />
              <span>Edit Post</span>
            </AdminNavLink>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/edit/new"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors text-xs"
          >
            <span>+ new blog</span>
          </Link>
          •
          <LogoutForm />
        </div>
      </div>
    </div>
  );
}
