"use client";

import {
  CaptureBox,
  NoteCard,
  NoteEditor,
  useSaveOnLeave,
} from "@/components/admin/side-panel/notes-panel";
import { PanelNotice } from "@/components/admin/side-panel/panel-notice";
import { useSidePanel } from "@/components/admin/side-panel/side-panel-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterNotes, sortNotes } from "@/lib/admin-notes";
import { cn } from "@/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * /admin/quick-notes: Keep-style. The cards fill a grid on the left and the
 * note being edited stays open on the right, so a note can be read while
 * another is written. Under lg the editor takes the list's place instead,
 * as in the panel. Same store as the panel, so both see every edit.
 */
export function QuickNotesPage() {
  const { notes } = useSidePanel();
  const [editingId, setEditingId] = useState<string | null>(null);
  // null while the search box is closed; the capture box sits there instead.
  const [query, setQuery] = useState<string | null>(null);
  useSaveOnLeave(editingId);

  const visible = useMemo(
    () => filterNotes(sortNotes(notes.notes), query ?? ""),
    [notes.notes, query],
  );
  const editing = editingId ? notes.notes.find((note) => note.id === editingId) : undefined;
  // The note being edited disappeared (deleted elsewhere, or dropped by a
  // refresh): drop editingId too, or the editor would reopen if it comes back.
  if (editingId && !editing && notes.status === "ready") setEditingId(null);

  const ready = notes.status === "ready";
  const leave = () => {
    if (editing) notes.discardIfBlank(editing.id);
    setEditingId(null);
  };

  return (
    // Same top padding as /admin, which also sits under the toolbar with no navbar.
    <div className="mx-auto max-w-6xl px-2 pb-8 pt-12 sm:px-4">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Ghi nhanh</h1>
        {ready && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {notes.notes.length} note
          </span>
        )}
      </header>

      {notes.status === "missing_table" || notes.status === "error" ? (
        <PanelNotice kind={notes.status} onRetry={notes.reload} />
      ) : (
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:items-start lg:gap-6">
          <div className={cn(editing && "hidden lg:block")}>
            <div className="mb-3 flex items-center gap-1.5">
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
              <p className="py-10 text-center text-xs text-muted-foreground">Đang tải…</p>
            )}
            {ready && visible.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {query ? "Không có note nào khớp." : "Chưa có ghi nhanh nào."}
              </p>
            )}

            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((note) => (
                <li key={note.id} className="min-w-0">
                  <NoteCard
                    note={note}
                    failed={notes.saveState[note.id] === "error"}
                    onOpen={() => setEditingId(note.id)}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Sticky with its own scroll, so a long note scrolls inside the
              box rather than pinning its top and hiding its end. */}
          <aside
            className={cn(
              "rounded-lg border bg-card lg:sticky lg:top-14 lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto",
              !editing && "hidden lg:block",
            )}
          >
            {editing ? (
              <NoteEditor
                key={editing.id}
                note={editing}
                saveState={notes.saveState[editing.id]}
                onBack={leave}
              />
            ) : (
              <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                Chọn một note, hoặc gõ vào ô bên trái để tạo note mới.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
