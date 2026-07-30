"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  buildQueryString,
  isSelectable,
  selectableIds,
  type AdminPostsQuery,
  type SortKey,
} from "@/lib/admin-posts";
import type { UnifiedPost } from "@/lib/posts";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  FileTextIcon,
  Loader2Icon,
  PencilIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAdminNav } from "./admin-nav";
import { AdminPostActions } from "./post-actions";

interface PostsTableProps {
  posts: UnifiedPost[];
  query: AdminPostsQuery;
  isTrash: boolean;
  total: number;
}

type BulkAction = "publish" | "unpublish" | "trash" | "restore" | "purge";

export function PostsTable({ posts, query, isTrash, total }: PostsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<BulkAction | null>(null);

  const ids = useMemo(() => selectableIds(posts), [posts]);
  const skipped = posts.length - ids.length;

  // Carrying a selection across a filter change is how you delete the wrong
  // posts: the rows you ticked in "drafts" are not the rows on screen now.
  const queryKey = buildQueryString(query);
  useEffect(() => {
    setSelected(new Set());
  }, [queryKey]);

  const selectedIds = useMemo(
    () => ids.filter((id) => selected.has(id)),
    [ids, selected],
  );
  const allSelected = ids.length > 0 && selectedIds.length === ids.length;

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(ids) : new Set());
  }

  async function runBulk(action: BulkAction, targets: string[]) {
    setPending(action);
    const failed: string[] = [];
    for (const id of targets) {
      try {
        const res = await request(action, id);
        if (!res.ok) failed.push(id);
      } catch {
        failed.push(id);
      }
    }
    setPending(null);
    setSelected(new Set());
    // One refresh at the end, not one per post.
    router.refresh();

    const done = targets.length - failed.length;
    if (failed.length) {
      toast.error(`${done}/${targets.length} ${LABEL[action]} — ${failed.length} thất bại`);
      return;
    }
    if (action === "trash") {
      const undone = [...targets];
      toast.success(`${done} bài đã vào trash`, {
        action: {
          label: "Undo",
          onClick: () => runBulk("restore", undone),
        },
      });
      return;
    }
    toast.success(`${done} bài ${LABEL[action]}`);
  }

  const busy = pending !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {posts.length} / {total}
        </span>
        {skipped > 0 && !isTrash && (
          <span className="font-mono">{skipped} mdx không chọn được</span>
        )}
      </div>

      {posts.length === 0 ? (
        total === 0 ? (
          <p className="text-muted-foreground text-center py-16 text-sm">
            {isTrash ? "Trash is empty." : "No posts yet."}
          </p>
        ) : (
          <EmptyFilters query={query} />
        )
      ) : (
        <div className="border rounded-md divide-y">
          <div className="grid grid-cols-[28px_minmax(0,1fr)_84px] sm:grid-cols-[28px_minmax(0,1fr)_64px_84px_110px_96px] items-center gap-3 px-3 py-2 text-xs text-muted-foreground bg-muted/30">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => toggleAll(v === true)}
              disabled={ids.length === 0 || busy}
              aria-label="Select all"
            />
            <SortHeader label="title" sort="title" query={query} />
            <span className="hidden sm:block">type</span>
            <span className="hidden sm:block">source</span>
            <SortHeader
              label={query.sort === "created" ? "created" : "edited"}
              sort={query.sort === "created" ? "created" : "edited"}
              query={query}
              className="hidden sm:block text-right"
            />
            <span className="text-right">actions</span>
          </div>

          {posts.map((post) => (
            <Row
              key={post.id}
              post={post}
              isTrash={isTrash}
              checked={selected.has(post.id)}
              disabled={busy}
              onToggle={toggleRow}
            />
          ))}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-md border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
            {skipped > 0 && (
              <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                · {skipped} mdx bỏ qua
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            {isTrash ? (
              <>
                <BulkButton
                  onClick={() => runBulk("restore", selectedIds)}
                  pending={pending === "restore"}
                  busy={busy}
                >
                  Restore
                </BulkButton>
                <BulkButton
                  variant="destructive"
                  onClick={() => runBulk("purge", selectedIds)}
                  pending={pending === "purge"}
                  busy={busy}
                >
                  Delete permanently
                </BulkButton>
              </>
            ) : (
              <>
                <BulkButton
                  onClick={() => runBulk("publish", selectedIds)}
                  pending={pending === "publish"}
                  busy={busy}
                >
                  Publish
                </BulkButton>
                <BulkButton
                  onClick={() => runBulk("unpublish", selectedIds)}
                  pending={pending === "unpublish"}
                  busy={busy}
                >
                  Unpublish
                </BulkButton>
                <BulkButton
                  variant="destructive"
                  onClick={() => runBulk("trash", selectedIds)}
                  pending={pending === "trash"}
                  busy={busy}
                >
                  Move to trash
                </BulkButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Filters are AND-ed, so an empty table usually means an older filter is still
 * on. Spelling out which ones, and offering one click out, beats leaving you to
 * hunt the sidebar for what you set three clicks ago.
 */
function EmptyFilters({ query }: { query: AdminPostsQuery }) {
  const { navigate } = useAdminNav();
  // With one view at a time, an empty table can only mean the search term.
  return (
    <div className="text-center py-16 space-y-3">
      <p className="text-muted-foreground text-sm">
        Không có bài nào khớp{" "}
        <span className="font-mono">&quot;{query.q}&quot;</span> trong{" "}
        <span className="font-mono">{query.view}</span>.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/admin${buildQueryString({ ...query, q: "" })}`)}
      >
        Clear search
      </Button>
    </div>
  );
}

const LABEL: Record<BulkAction, string> = {
  publish: "đã publish",
  unpublish: "đã chuyển về draft",
  trash: "đã vào trash",
  restore: "đã khôi phục",
  purge: "đã xoá vĩnh viễn",
};

/** Bulk reuses the per-post endpoints; no new API surface. */
function request(action: BulkAction, id: string): Promise<Response> {
  switch (action) {
    case "publish":
    case "unpublish":
      return fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: action === "publish" }),
      });
    case "restore":
      return fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted_at: null }),
      });
    case "trash":
      return fetch(`/api/posts/${id}`, { method: "DELETE" });
    case "purge":
      return fetch(`/api/posts/${id}?permanent=true`, { method: "DELETE" });
  }
}

function BulkButton({
  children,
  onClick,
  pending,
  busy,
  variant = "outline",
}: {
  children: React.ReactNode;
  onClick: () => void;
  pending: boolean;
  busy: boolean;
  variant?: "outline" | "destructive";
}) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} disabled={busy}>
      {pending && <Loader2Icon className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
      {children}
    </Button>
  );
}

function SortHeader({
  label,
  sort,
  query,
  className = "",
}: {
  label: string;
  sort: SortKey;
  query: AdminPostsQuery;
  className?: string;
}) {
  const { navigate } = useAdminNav();
  const active = query.sort === sort;
  // Clicking the active column flips direction; a new column starts descending,
  // which for dates means newest first.
  const dir = active && query.dir === "desc" ? "asc" : "desc";
  const href = `/admin${buildQueryString({ ...query, sort, dir })}`;
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        active ? "text-foreground" : ""
      } ${className}`}
    >
      {label}
      {active &&
        (query.dir === "asc" ? (
          <ArrowUpIcon className="w-3 h-3" />
        ) : (
          <ArrowDownIcon className="w-3 h-3" />
        ))}
    </Link>
  );
}

function Row({
  post,
  isTrash,
  checked,
  disabled,
  onToggle,
}: {
  post: UnifiedPost;
  isTrash: boolean;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const selectable = isSelectable(post);
  const dateLabel = new Date(post.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const href = selectable
    ? isTrash
      ? null
      : `/admin/edit/${post.id}`
    : `/blog/${post.slug}`;

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_84px] sm:grid-cols-[28px_minmax(0,1fr)_64px_84px_110px_96px] items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onToggle(post.id, v === true)}
        disabled={!selectable || disabled}
        aria-label={selectable ? `Select ${post.title}` : "MDX posts cannot be bulk edited"}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {href ? (
            <Link
              href={href}
              target={selectable ? undefined : "_blank"}
              className="font-medium truncate hover:underline"
            >
              {post.title}
            </Link>
          ) : (
            <span className="font-medium truncate">{post.title}</span>
          )}
          {!isTrash && !post.isPublished && (
            <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
              draft
            </span>
          )}
          {post.deletedAt && (
            <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              deleted
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          /{post.slug}
        </div>
      </div>
      <span className="hidden sm:block font-mono text-xs text-muted-foreground truncate">
        {post.type}
      </span>
      <span
        className={`hidden sm:block font-mono text-xs truncate ${
          post.source === "supabase"
            ? "text-purple-600 dark:text-purple-400"
            : "text-blue-600 dark:text-blue-400"
        }`}
      >
        {post.source}
      </span>
      <span className="hidden sm:block tabular-nums text-xs text-muted-foreground text-right">
        {dateLabel}
      </span>
      <div className="flex gap-1 shrink-0 justify-end">
        {selectable ? (
          <>
            {!isTrash && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/edit/${post.id}`} aria-label="Edit">
                  <PencilIcon className="w-4 h-4" />
                </Link>
              </Button>
            )}
            <AdminPostActions
              id={post.id}
              title={post.title}
              isDeleted={!!post.deletedAt}
            />
          </>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/blog/${post.slug}`} target="_blank" aria-label="View">
              <FileTextIcon className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
