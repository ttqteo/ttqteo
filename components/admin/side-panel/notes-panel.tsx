"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  filterNotes,
  MAX_NOTE_LENGTH,
  notePreview,
  noteTitle,
  sortNotes,
  type AdminNote,
} from "@/lib/admin-notes";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, PinIcon, PinOffIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LinkedText, NoteLinks } from "./note-links";
import { PanelNotice } from "./panel-notice";
import { useSidePanel } from "./side-panel-provider";
import type { SaveState } from "./use-notes-store";

/** Whether `el` already sits fully inside the visible part of `scrollArea`. */
function isWithinScrollArea(el: HTMLElement, scrollArea: HTMLElement): boolean {
  const elRect = el.getBoundingClientRect();
  const areaRect = scrollArea.getBoundingClientRect();
  return elRect.top >= areaRect.top && elRect.bottom <= areaRect.bottom;
}

/**
 * Leaving a note, by the back arrow or by closing the panel or page, saves
 * what is waiting and drops the note if nothing was written in it.
 */
export function useSaveOnLeave(editingId: string | null) {
  const { flush, discardIfBlank } = useSidePanel().notes;
  useEffect(() => {
    if (!editingId) return;
    return () => {
      flush(editingId);
      discardIfBlank(editingId);
    };
  }, [editingId, flush, discardIfBlank]);
}

export function NotesPanel({ autoFocus }: { autoFocus: boolean }) {
  const { notes } = useSidePanel();
  const [editingId, setEditingId] = useState<string | null>(null);
  // null while the search box is closed; the capture box sits there instead.
  const [query, setQuery] = useState<string | null>(null);
  // The id of the note just left, so focus can land back on its card once the
  // list is showing again; cleared once that focus has been applied.
  const leftNoteId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useSaveOnLeave(editingId);

  const visible = useMemo(
    () => filterNotes(sortNotes(notes.notes), query ?? ""),
    [notes.notes, query],
  );
  const editing = editingId ? notes.notes.find((note) => note.id === editingId) : undefined;
  // The note being edited disappeared (deleted elsewhere, or dropped by a
  // refresh): drop editingId too, or the editor would reopen if it comes back.
  if (editingId && !editing && notes.status === "ready") setEditingId(null);

  // After leaving the editor, focus lands on the card of the note just left,
  // or on the search box if it is open, or on the capture box otherwise; this
  // runs when that card is gone too (deleted, or blank and about to be
  // discarded by onBack below). Scrolling only happens for a card outside the
  // panel's own scroll area; one already in view stays put.
  useEffect(() => {
    const id = leftNoteId.current;
    if (id === null || editingId !== null) return;
    leftNoteId.current = null;
    const root = listRef.current;
    const card = root?.querySelector<HTMLElement>(`[data-note-id="${id}"]`);
    if (card) {
      const scrollArea = card.closest<HTMLElement>(".overflow-y-auto");
      const inView = !scrollArea || isWithinScrollArea(card, scrollArea);
      card.focus(inView ? { preventScroll: true } : undefined);
    } else if (query !== null) {
      root?.querySelector<HTMLElement>("[data-note-search]")?.focus();
    } else {
      root?.querySelector<HTMLElement>("[data-note-capture]")?.focus();
    }
  }, [editingId, query]);

  if (notes.status === "missing_table" || notes.status === "error") {
    return <PanelNotice kind={notes.status} onRetry={notes.reload} />;
  }

  if (editing) {
    return (
      <NoteEditor
        note={editing}
        saveState={notes.saveState[editing.id]}
        onBack={() => {
          leftNoteId.current = editing.id;
          // Before dropping editingId, so a blank note is already gone from
          // the list by the time the focus-return effect above runs, rather
          // than still showing (and receiving focus) for one more render.
          notes.discardIfBlank(editing.id);
          setEditingId(null);
        }}
      />
    );
  }

  const ready = notes.status === "ready";
  return (
    <div ref={listRef} className="space-y-3 p-3">
      <div className="flex items-center gap-1.5">
        {query === null ? (
          <CaptureBox
            autoFocus={autoFocus}
            disabled={!ready}
            onStart={(body) => setEditingId(notes.create(body).id)}
          />
        ) : (
          <Input
            autoFocus
            data-note-search
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
              event.stopPropagation();
              setQuery(null);
            }}
            placeholder="Tìm trong ghi nhanh…"
            aria-label="Tìm trong ghi nhanh"
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

      {(notes.status === "idle" || notes.status === "loading") && (
        <p className="py-6 text-center text-xs text-muted-foreground">Đang tải…</p>
      )}
      {ready && visible.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {query ? "Không có note nào khớp." : "Chưa có ghi nhanh nào."}
        </p>
      )}

      <ul className="space-y-2">
        {visible.map((note) => (
          <li key={note.id}>
            <NoteCard
              note={note}
              failed={notes.saveState[note.id] === "error"}
              onOpen={() => setEditingId(note.id)}
            />
          </li>
        ))}
      </ul>

      <Link
        href="/admin/notes"
        className="block pt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Ghi chú riêng trong bài →
      </Link>
    </div>
  );
}

/**
 * The "take a note" box. The first character typed becomes a new note and the
 * editor takes over with the cursor after it. An IME composition is left to
 * finish first, so the switch never cuts a character in half.
 */
export function CaptureBox({
  autoFocus,
  disabled,
  onStart,
}: {
  autoFocus: boolean;
  disabled: boolean;
  onStart: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  // Not the autoFocus attribute: the box is disabled until notes have loaded,
  // and a disabled input cannot take focus.
  useEffect(() => {
    if (autoFocus && !disabled) input.current?.focus();
  }, [autoFocus, disabled]);

  const take = (value: string) => {
    if (!value.trim()) {
      setDraft(value);
      return;
    }
    setDraft("");
    onStart(value);
  };

  return (
    <Input
      ref={input}
      data-note-capture
      value={draft}
      disabled={disabled}
      maxLength={MAX_NOTE_LENGTH}
      placeholder="Ghi gì đó…"
      aria-label="Ghi nhanh mới"
      className="h-9"
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        take(event.currentTarget.value);
      }}
      onChange={(event) => {
        if (composing.current) setDraft(event.target.value);
        else take(event.target.value);
      }}
    />
  );
}

export function NoteCard({
  note,
  failed,
  onOpen,
}: {
  note: AdminNote;
  failed: boolean;
  onOpen: () => void;
}) {
  const title = noteTitle(note.body);
  const preview = notePreview(note.body);

  return (
    <button
      type="button"
      onClick={onOpen}
      data-note-id={note.id}
      className="block w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex items-start gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
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
        <span className="mt-1 line-clamp-3 block whitespace-pre-line text-xs text-muted-foreground">
          <LinkedText text={preview} />
        </span>
      )}
    </button>
  );
}

// Same colours as the editor's save dot (app/admin/edit/[id]/edit-post-client.tsx).
const SAVE_DOT: Record<SaveState, { dot: string; label: string }> = {
  dirty: { dot: "bg-amber-500", label: "Chưa lưu" },
  saving: { dot: "bg-amber-500 animate-pulse", label: "Đang lưu" },
  saved: { dot: "bg-green-500", label: "Đã lưu" },
  error: { dot: "bg-destructive", label: "Lưu lỗi, bấm để thử lại" },
};

export function NoteEditor({
  note,
  saveState,
  onBack,
}: {
  note: AdminNote;
  saveState: SaveState | undefined;
  onBack: () => void;
}) {
  const { notes } = useSidePanel();
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Cursor at the end, where the capture box left off.
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Grow with the text, so the panel scrolls rather than a box inside it.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [note.body]);

  const dot = saveState ? SAVE_DOT[saveState] : null;

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-background px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack}
          aria-label="Về danh sách"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        {dot && (
          <button
            type="button"
            disabled={saveState !== "error"}
            onClick={() => notes.flush(note.id)}
            title={dot.label}
            aria-label={dot.label}
            className="grid h-8 w-8 place-items-center disabled:cursor-default"
          >
            <span className={cn("h-2 w-2 rounded-full", dot.dot)} />
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => notes.togglePin(note)}
            aria-label="Ghim"
            aria-pressed={note.pinned}
          >
            {note.pinned ? <PinOffIcon className="h-4 w-4" /> : <PinIcon className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              notes.remove(note);
              onBack();
            }}
            aria-label="Xoá note"
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <textarea
        ref={textarea}
        value={note.body}
        onChange={(event) => notes.edit(note, event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Ghi gì đó…"
        aria-label="Nội dung note"
        rows={6}
        className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none"
      />
      {/* Right under the text, Keep-style, rather than pinned to the panel's
          foot: a short note would otherwise show its links a screen away. */}
      <NoteLinks body={note.body} />
    </div>
  );
}
