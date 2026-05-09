"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UnifiedPost } from "@/lib/posts";
import { FileTextIcon, PencilIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPostActions } from "../post-actions";

type TypeFilter = "all" | "post" | "note" | "reading" | "paper";
type SourceFilter = "all" | "supabase" | "mdx";
type StatusFilter = "all" | "published" | "draft";

interface PostsListProps {
  posts: UnifiedPost[];
  isTrash: boolean;
}

export function PostsList({ posts, isTrash }: PostsListProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
      if (type !== "all" && p.type !== type) return false;
      if (source !== "all" && p.source !== source) return false;
      if (!isTrash && status !== "all") {
        if (status === "published" && !p.isPublished) return false;
        if (status === "draft" && p.isPublished) return false;
      }
      return true;
    });
  }, [posts, search, type, source, status, isTrash]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or slug…"
            className="pl-8 h-9"
          />
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {posts.length}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <PillGroup
          label="type"
          value={type}
          onChange={(v) => setType(v as TypeFilter)}
          options={["all", "post", "note", "reading", "paper"]}
        />
        <PillGroup
          label="source"
          value={source}
          onChange={(v) => setSource(v as SourceFilter)}
          options={["all", "supabase", "mdx"]}
        />
        {!isTrash && (
          <PillGroup
            label="status"
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            options={["all", "published", "draft"]}
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12 text-sm">
          {posts.length === 0
            ? isTrash
              ? "Trash is empty."
              : "No blogs yet."
            : "No posts match these filters."}
        </p>
      ) : (
        <div className="border rounded-md divide-y">
          {filtered.map((p) => (
            <PostRow key={p.id} post={p} isTrash={isTrash} />
          ))}
        </div>
      )}
    </div>
  );
}

function PillGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-muted-foreground/70 mr-1">{label}</span>
      {options.map((opt, i) => (
        <span key={opt} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(opt)}
            className={`transition-colors ${
              value === opt
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt}
          </button>
          {i < options.length - 1 && <span className="text-muted-foreground/40">·</span>}
        </span>
      ))}
    </div>
  );
}

function PostRow({ post, isTrash }: { post: UnifiedPost; isTrash: boolean }) {
  const dateLabel = new Date(post.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_84px] sm:grid-cols-[minmax(0,1fr)_64px_84px_100px_84px] items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {(() => {
            const href =
              post.source === "supabase"
                ? isTrash
                  ? null
                  : `/admin/edit/${post.id}`
                : `/blog/${post.slug}`;
            const target = post.source === "mdx" ? "_blank" : undefined;
            return href ? (
              <Link
                href={href}
                target={target}
                className="font-medium truncate hover:underline"
              >
                {post.title}
              </Link>
            ) : (
              <span className="font-medium truncate">{post.title}</span>
            );
          })()}
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
      <span className="hidden sm:block font-mono text-xs text-muted-foreground truncate">{post.type}</span>
      <span
        className={`hidden sm:block font-mono text-xs truncate ${
          post.source === "supabase" ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"
        }`}
      >
        {post.source}
      </span>
      <span className="hidden sm:block tabular-nums text-xs text-muted-foreground text-right">{dateLabel}</span>
      <div className="flex gap-1 shrink-0 justify-end">
        {post.source === "supabase" ? (
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
