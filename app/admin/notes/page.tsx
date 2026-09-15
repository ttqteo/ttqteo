import { PostHtml } from "@/components/post-html";
import { getPostsWithPrivateNotes } from "@/lib/posts";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { cn } from "@/lib/utils";
import { EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Every private note across the posts, grouped by post, so the ones still
 * waiting on you are one click from the toolbar instead of scattered through
 * drafts. Read-only: a note is edited where it lives, in its post.
 */
export default async function AdminNotesPage() {
  // /admin already renders the sign-in and unauthorized screens.
  if (!(await getUser()) || !(await isAdmin())) redirect("/admin");

  const posts = await getPostsWithPrivateNotes();
  const total = posts.reduce((n, post) => n + post.notes.length, 0);

  return (
    // Same top padding as /admin, which also sits under the toolbar with no navbar.
    <div className="max-w-3xl mx-auto pt-12 pb-8 px-2 sm:px-4 space-y-8">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Ghi chú riêng</h1>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {total} ghi chú · {posts.length} bài
        </span>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-center py-16 text-sm">
          Chưa có ghi chú riêng nào. Trong editor, chọn Chèn → Ghi chú riêng hoặc bấm
          Ctrl+Alt+N.
        </p>
      ) : (
        posts.map((post) => (
          <section key={post.id} className="space-y-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                title={post.isPublished ? "published" : "draft"}
                aria-label={post.isPublished ? "published" : "draft"}
                className={cn(
                  "shrink-0 h-2 w-2 rounded-full",
                  post.isPublished ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              <Link
                href={`/admin/edit/${post.id}`}
                className="font-medium truncate hover:underline"
              >
                {post.title}
              </Link>
              <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
                {new Date(post.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {post.notes.map((html, i) => (
              // Same box the editor draws, so a note looks the same in both places.
              <aside key={i} className="private-note !my-0">
                <div className="private-note-label">
                  <EyeOffIcon className="h-3 w-3" aria-hidden />
                  {post.notes.length > 1 ? `ghi chú ${i + 1}/${post.notes.length}` : "ghi chú"}
                </div>
                {/* The admin's own markup from the editor, never a reader's.
                    Through PostHtml, like the published page, so a code block
                    gets its language bar, copy button, line numbers and
                    colours instead of a bare <pre>. */}
                <PostHtml
                  html={html}
                  className="private-note-body prose prose-sm prose-zinc dark:prose-invert max-w-none"
                />
              </aside>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
