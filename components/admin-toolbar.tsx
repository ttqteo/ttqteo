"use client";

import {
  FileTextIcon,
  MoonIcon,
  PanelRightIcon,
  PencilIcon,
  StickyNoteIcon,
  SunIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { AdminNavLink } from "@/components/admin-nav-link";
import { LogoutForm } from "@/components/admin/logout-form";
import { PANELS } from "@/components/admin/side-panel/panels";
import { OPEN_ADMIN_SHEET_EVENT } from "@/lib/admin-panel-prefs";

interface AdminToolbarProps {
  editPostId?: string;
}

/**
 * The toolbar is always dark, so this cannot borrow the site's ghost button:
 * its hover and foreground follow the theme and would go invisible in light
 * mode. Which icon shows is decided by CSS off the `dark` class next-themes
 * writes before hydration, not by reading the theme during render, so there is
 * no mismatch and no need to wait for mount.
 */
function ToolbarThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Đổi giao diện sáng/tối"
      title="Đổi giao diện sáng/tối"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative grid h-5 w-5 place-items-center text-zinc-300 transition-colors hover:text-white"
    >
      <SunIcon className="h-3.5 w-3.5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </button>
  );
}

export function AdminToolbar({ editPostId }: AdminToolbarProps) {
  const pathname = usePathname();
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
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-2 hover:text-zinc-300 transition-colors bg-zinc-800/50 py-0.5 px-2 rounded-full border border-zinc-700/50 leading-none"
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
          <div className="w-px h-4 bg-zinc-700 shrink-0 sm:mx-1" />
          {/* /admin is the post list now, so dashboard and posts are one item.
              On a phone the labels here are for screen readers only: next to
              the side panel's button, the bar no longer fits them at 390px. */}
          <AdminNavLink href="/admin" exact>
            <FileTextIcon className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only">posts</span>
          </AdminNavLink>
          {/* Every note, quick and in-post, on one page; same icon as the
              rail's Ghi nhanh, which is the panel of the same notes. */}
          <AdminNavLink href="/admin/notes">
            <StickyNoteIcon className="w-3.5 h-3.5 shrink-0" />
            {/* Icon only on a phone, so the bar still fits. */}
            <span className="sr-only sm:not-sr-only">notes</span>
          </AdminNavLink>
          {/* Calendar and Task as pages. From md up only: a phone reaches
              them through the sheet, and the bar has no room for more icons
              at 390px. */}
          <div className="hidden md:contents">
            {PANELS.filter((panel) => panel.id !== "notes").map(({ id, href, label, icon: Icon }) => (
              <AdminNavLink key={id} href={href}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label.toLowerCase()}
              </AdminNavLink>
            ))}
          </div>
          {editPostId && (
            <AdminNavLink href={`/admin/edit/${editPostId}`}>
              <PencilIcon className="w-3.5 h-3.5 shrink-0" />
              {/* The icon carries it on a phone; the bar has to fit the logo,
                  posts, new and logout on 390px too. */}
              <span className="sr-only sm:not-sr-only">Edit Post</span>
            </AdminNavLink>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {/* The side panel's way in on a phone, where its rail does not fit.
              Only under /admin, the one place the panel is mounted; the
              toolbar sits outside it, hence the event. */}
          {pathname.startsWith("/admin") && (
            <button
              type="button"
              aria-label="Lịch, task và ghi nhanh"
              title="Lịch, task và ghi nhanh"
              onClick={() => window.dispatchEvent(new Event(OPEN_ADMIN_SHEET_EVENT))}
              className="grid h-5 w-5 place-items-center text-zinc-300 transition-colors hover:text-white md:hidden"
            >
              <PanelRightIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            href="/admin/edit/new"
            className="flex items-center gap-1.5 whitespace-nowrap hover:text-zinc-300 transition-colors text-xs"
          >
            <span className="sm:hidden">+ new</span>
            <span className="hidden sm:inline">+ new blog</span>
          </Link>
          <span className="hidden sm:inline">•</span>
          <ToolbarThemeToggle />
          <span className="hidden sm:inline">•</span>
          <LogoutForm />
        </div>
      </div>
    </div>
  );
}
