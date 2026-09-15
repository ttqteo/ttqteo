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
import { cn } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePostsQuery } from "./posts-query";
import { AdminPostActions } from "./post-actions";

interface PostsTableProps {
  /** Rows for the current page only — selection and bulk actions work on these. */
  posts: UnifiedPost[];
  query: AdminPostsQuery;
  isTrash: boolean;
  total: number;
  /** How many posts match the view and search, across every page. */
  matching: number;
}

type BulkAction = "publish" | "unpublish" | "trash" | "restore" | "purge";

export function PostsTable({ posts, query, isTrash, total, matching }: PostsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Phones start with no checkbox column at all: every row carrying one costs
  // width the title needs, for an action that is mostly a desktop workflow.
  // "Chọn" in a row's menu turns the column on. Desktop always shows it.
  const [selecting, setSelecting] = useState(false);
  const [pending, setPending] = useState<BulkAction | null>(null);

  const ids = useMemo(() => selectableIds(posts), [posts]);
  const skipped = posts.length - ids.length;

  // Carrying a selection across a filter change is how you delete the wrong
  // posts: the rows you ticked in "drafts" are not the rows on screen now.
  //
  // Reset during render rather than in an effect. The filter fully determines
  // that the selection is void, so waiting for an effect would paint one frame
  // of the new list still showing the old ticks.
  const queryKey = buildQueryString(query);
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    setSelected(new Set());
    setSelecting(false);
  }

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
  // Both are literal strings so Tailwind still sees the column templates.
  const gridCols = selecting
    ? "grid-cols-[22px_minmax(0,1fr)_36px] sm:grid-cols-[28px_minmax(0,1fr)_64px_84px_110px_96px]"
    : "grid-cols-[minmax(0,1fr)_36px] sm:grid-cols-[28px_minmax(0,1fr)_64px_84px_110px_96px]";
  const checkboxCell = selecting ? "" : "hidden sm:block";
  // Selection mode opens the bar before anything is ticked, so every bulk
  // action has to sit out until it has targets. Without this they run against
  // an empty list and report "0 bài đã publish", which reads as a failure.
  const noTargets = selectedIds.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {matching} / {total}
        </span>
        <span className="flex items-center gap-2.5">
          <LegendDot className="bg-emerald-500" label="published" />
          <LegendDot className="bg-amber-500" label="draft" />
          {isTrash && <LegendDot className="bg-red-500" label="deleted" />}
        </span>
        {skipped > 0 && !isTrash && (
          <span className="font-mono ml-auto">{skipped} mdx không chọn được</span>
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
          <div
            className={cn(
              "grid items-center gap-2 sm:gap-3 px-1.5 sm:px-3 py-2 text-xs text-muted-foreground bg-muted/30",
              gridCols,
            )}
          >
            <div className={checkboxCell}>
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => toggleAll(v === true)}
                disabled={ids.length === 0 || busy}
                aria-label="Select all"
              />
            </div>
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
              selecting={selecting}
              gridCols={gridCols}
              checkboxCell={checkboxCell}
              onStartSelect={() => {
                setSelecting(true);
                toggleRow(post.id, true);
              }}
            />
          ))}
        </div>
      )}

      {(selectedIds.length > 0 || selecting) && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-md border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {noTargets ? (
              <span className="text-muted-foreground font-normal">
                Chọn bài để thao tác
              </span>
            ) : (
              <>
                {selectedIds.length} selected
                {skipped > 0 && (
                  <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                    · {skipped} mdx bỏ qua
                  </span>
                )}
              </>
            )}
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            {selecting && (
              <Button
                variant="ghost"
                size="sm"
                className="sm:hidden"
                disabled={busy}
                onClick={() => {
                  setSelecting(false);
                  setSelected(new Set());
                }}
              >
                Xong
              </Button>
            )}
            {isTrash ? (
              <>
                <BulkButton
                  onClick={() => runBulk("restore", selectedIds)}
                  pending={pending === "restore"}
                  busy={busy || noTargets}
                >
                  Restore
                </BulkButton>
                <BulkButton
                  variant="destructive"
                  onClick={() => runBulk("purge", selectedIds)}
                  pending={pending === "purge"}
                  busy={busy || noTargets}
                >
                  Delete permanently
                </BulkButton>
              </>
            ) : (
              <>
                <BulkButton
                  onClick={() => runBulk("publish", selectedIds)}
                  pending={pending === "publish"}
                  busy={busy || noTargets}
                >
                  Publish
                </BulkButton>
                <BulkButton
                  onClick={() => runBulk("unpublish", selectedIds)}
                  pending={pending === "unpublish"}
                  busy={busy || noTargets}
                >
                  Unpublish
                </BulkButton>
                <BulkButton
                  variant="destructive"
                  onClick={() => runBulk("trash", selectedIds)}
                  pending={pending === "trash"}
                  busy={busy || noTargets}
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
  const { setQuery } = usePostsQuery();
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
        onClick={() => setQuery({ q: "" })}
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
  const { setQuery } = usePostsQuery();
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
        setQuery({ sort, dir });
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
  selecting,
  gridCols,
  checkboxCell,
  onStartSelect,
}: {
  post: UnifiedPost;
  isTrash: boolean;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string, checked: boolean) => void;
  selecting: boolean;
  gridCols: string;
  checkboxCell: string;
  onStartSelect: () => void;
}) {
  const selectable = isSelectable(post);
  const status = post.deletedAt
    ? { label: "deleted", className: "bg-red-500" }
    : post.isPublished
      ? { label: "published", className: "bg-emerald-500" }
      : { label: "draft", className: "bg-amber-500" };
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
    <div
      className={cn(
        "grid items-start sm:items-center gap-2 sm:gap-3 px-1.5 sm:px-3 py-2 hover:bg-muted/40 transition-colors",
        gridCols,
      )}
    >
      <div className={cn(checkboxCell, "mt-0.5 sm:mt-0")}>
        {selectable ? (
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => onToggle(post.id, v === true)}
            disabled={disabled}
            aria-label={`Select ${post.title}`}
          />
        ) : (
          // MDX posts are files, with no row for a bulk action to touch. A
          // dashed outline holds the column straight and reads as unavailable
          // rather than as a box you have not ticked yet.
          <span
            title="Bài MDX là file, không chọn được"
            className="block h-4 w-4 rounded-sm border border-dashed border-muted-foreground/40"
          />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0">
          {/* A dot instead of the word: it says the same thing in a fraction of
              the width, which on a phone is width the title gets back. The
              legend above the table carries the meaning. */}
          <span
            title={status.label}
            aria-label={status.label}
            className={cn(
              "shrink-0 h-2 w-2 rounded-full mt-[7px] sm:mt-0",
              status.className,
            )}
          />
          {href ? (
            <Link
              href={href}
              target={selectable ? undefined : "_blank"}
              className="font-medium text-sm sm:text-base line-clamp-2 sm:line-clamp-1 hover:underline"
            >
              {post.title}
            </Link>
          ) : (
            <span className="font-medium text-sm sm:text-base line-clamp-2 sm:line-clamp-1">
              {post.title}
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
      <div className="shrink-0">
        <AdminPostActions
          id={post.id}
          title={post.title}
          slug={post.slug}
          isDeleted={!!post.deletedAt}
          selectable={selectable}
          onStartSelect={selecting ? undefined : onStartSelect}
        />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}
