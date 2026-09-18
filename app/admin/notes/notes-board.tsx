"use client";

import { LinkedText, LinkPreview } from "@/components/admin/side-panel/note-links";
import { CaptureBox, NoteEditor, useSaveOnLeave } from "@/components/admin/side-panel/notes-panel";
import { PanelNotice } from "@/components/admin/side-panel/panel-notice";
import { useSidePanel } from "@/components/admin/side-panel/side-panel-provider";
import { PostHtml } from "@/components/post-html";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { notePreview, noteTitle, type AdminNote } from "@/lib/admin-notes";
import {
  boardItems,
  type BoardFilter,
  type BoardItem,
  type PostNoteSource,
} from "@/lib/notes-board";
import { cn } from "@/lib/utils";
import { EyeOffIcon, PinIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "quick", label: "Ghi nhanh" },
  { id: "post", label: "Trong bài" },
];

/** Lines of a quick note a card shows; the panel's cards stop at three. */
const CARD_LINES = 12;

/**
 * /admin/notes, Keep-style: one board of cards for the quick notes and the
 * private notes inside posts, pinned first, then everything by last edit.
 * A quick note opens in a dialog over the board and is edited there; a note
 * in a post is edited where it lives, so its card links to the post. Quick
 * notes come from the side panel's store, so panel and board see every edit.
 */
export function NotesBoard({ posts }: { posts: PostNoteSource[] }) {
  const { notes } = useSidePanel();
  const [editingId, setEditingId] = useState<string | null>(null);
  // null while the search box is closed; the capture box sits there instead.
  const [query, setQuery] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>("all");
  useSaveOnLeave(editingId);

  const { pinned, others } = useMemo(
    () => boardItems(notes.notes, posts, { query: query ?? "", filter }),
    [notes.notes, posts, query, filter],
  );
  const editing = editingId ? notes.notes.find((note) => note.id === editingId) : undefined;
  // The note being edited disappeared (deleted elsewhere, or dropped by a
  // refresh): drop editingId too, or the editor would reopen if it comes back.
  if (editingId && !editing && notes.status === "ready") setEditingId(null);

  const ready = notes.status === "ready";
  const inPosts = posts.reduce((n, post) => n + post.notes.length, 0);
  const leave = () => {
    if (editing) notes.discardIfBlank(editing.id);
    setEditingId(null);
  };
  const open = (note: AdminNote) => setEditingId(note.id);

  return (
    // Same top padding as /admin, which also sits under the toolbar with no navbar.
    <div className="mx-auto max-w-7xl px-2 pb-8 pt-12 sm:px-4">
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Ghi chú</h1>
        {ready && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {notes.notes.length} ghi nhanh · {inPosts} trong bài
          </span>
        )}
      </header>

      {notes.status === "missing_table" || notes.status === "error" ? (
        <PanelNotice kind={notes.status} onRetry={notes.reload} />
      ) : (
        <>
          <div className="mx-auto mb-3 flex max-w-xl items-center gap-1.5">
            {query === null ? (
              <CaptureBox
                autoFocus
                disabled={!ready}
                onStart={(body) => setEditingId(notes.create(body).id)}
              />
            ) : (
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
                  setQuery(null);
                }}
                placeholder="Tìm trong ghi chú…"
                aria-label="Tìm trong ghi chú"
                className="h-9"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setQuery((q) => (q === null ? "" : null))}
              aria-label={query === null ? "Tìm" : "Đóng tìm kiếm"}
            >
              {query === null ? <SearchIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mb-5 flex justify-center gap-1">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  filter === option.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {(notes.status === "idle" || notes.status === "loading") && (
            <p className="py-10 text-center text-xs text-muted-foreground">Đang tải…</p>
          )}
          {ready && pinned.length === 0 && others.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {query
                ? "Không có ghi chú nào khớp."
                : filter === "post"
                  ? "Chưa có ghi chú trong bài nào. Trong editor, chọn Chèn → Ghi chú riêng hoặc bấm Ctrl+Alt+N."
                  : "Chưa có ghi chú nào."}
            </p>
          )}

          <BoardSection
            title="Ghim"
            items={pinned}
            saveState={notes.saveState}
            onOpen={open}
          />
          <BoardSection
            title={pinned.length > 0 ? "Khác" : null}
            items={others}
            saveState={notes.saveState}
            onOpen={open}
          />
        </>
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(isOpen) => {
          if (!isOpen) leave();
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Sửa ghi nhanh</DialogTitle>
          {editing && (
            <NoteEditor
              key={editing.id}
              note={editing}
              saveState={notes.saveState[editing.id]}
              onBack={leave}
              // The dialog's Esc sits over the header's right corner.
              headerClassName="pr-14"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardSection({
  title,
  items,
  saveState,
  onOpen,
}: {
  title: string | null;
  items: BoardItem[];
  saveState: Record<string, string>;
  onOpen: (note: AdminNote) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-2">
      {title && (
        <h2 className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
          {title}
        </h2>
      )}
      {/* CSS columns for the masonry: cheap, and the order down each column
          reads fine for notes. Every card avoids breaking across columns. */}
      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
        {items.map((item) =>
          item.kind === "quick" ? (
            <QuickCard
              key={item.key}
              note={item.note}
              failed={saveState[item.note.id] === "error"}
              onOpen={() => onOpen(item.note)}
            />
          ) : (
            <PostNoteCard key={item.key} item={item} />
          ),
        )}
      </div>
    </section>
  );
}

function QuickCard({
  note,
  failed,
  onOpen,
}: {
  note: AdminNote;
  failed: boolean;
  onOpen: () => void;
}) {
  const title = noteTitle(note.body);
  const preview = notePreview(note.body, CARD_LINES);

  return (
    <button
      type="button"
      onClick={onOpen}
      data-note-id={note.id}
      className="mb-3 block w-full break-inside-avoid rounded-lg border bg-card p-3 text-left transition-shadow hover:shadow-md"
    >
      <span className="flex items-start gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 break-words text-sm font-medium",
            !title && "text-muted-foreground",
          )}
        >
          {title ? <LinkedText text={title} /> : "Note trống"}
        </span>
        {note.pinned && (
          <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Đã ghim" />
        )}
        {failed && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" title="Chưa lưu được">
            <span className="sr-only">Chưa lưu được</span>
          </span>
        )}
      </span>
      {preview && (
        <span className="mt-1 line-clamp-[12] block whitespace-pre-line break-words text-xs text-muted-foreground">
          <LinkedText text={preview} />
        </span>
      )}
      <LinkPreview body={note.body} />
    </button>
  );
}

/**
 * A private note from a post, in the same dashed amber box the editor draws
 * it in. Read-only here: the chip at the foot opens the post to edit it. Not
 * a link itself, since a code block inside carries its own copy button.
 */
function PostNoteCard({ item }: { item: Extract<BoardItem, { kind: "post" }> }) {
  const { post, html, index } = item;
  return (
    // The editor's box comes with my-5 and room for its label; the board sets both.
    <article className="private-note break-inside-avoid !mb-3 !mt-0 !pt-6">
      <div className="private-note-label">
        <EyeOffIcon className="h-3 w-3" aria-hidden />
        {post.notes.length > 1 ? `ghi chú ${index + 1}/${post.notes.length}` : "ghi chú trong bài"}
      </div>
      <div className="max-h-72 overflow-hidden">
        <PostHtml
          html={html}
          className="private-note-body prose prose-sm prose-zinc dark:prose-invert max-w-none"
        />
      </div>
      <Link
        href={`/admin/edit/${post.id}`}
        className="mt-3 flex items-center gap-1.5 rounded-md border bg-background/70 px-2 py-1 text-xs transition-colors hover:bg-muted"
      >
        <span
          title={post.isPublished ? "published" : "draft"}
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            post.isPublished ? "bg-emerald-500" : "bg-amber-500",
          )}
        />
        <span className="min-w-0 truncate">{post.title}</span>
      </Link>
    </article>
  );
}
