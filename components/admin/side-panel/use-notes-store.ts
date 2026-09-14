"use client";

import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";
import {
  CLOCK_AHEAD,
  isBlankNote,
  keepaliveSaves,
  nextStamp,
  NOTE_DELETED,
  noteSaveBody,
  type AdminNote,
} from "@/lib/admin-notes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { LoadStatus } from "./load-status";
import { clearAdminSession, reportAdminError } from "./report-admin-error";

export type SaveState = "dirty" | "saving" | "saved" | "error";

export type NotesStore = {
  status: LoadStatus;
  notes: AdminNote[];
  saveState: Record<string, SaveState>;
  reload: () => void;
  create: (body: string) => AdminNote;
  edit: (note: AdminNote, body: string) => void;
  togglePin: (note: AdminNote) => void;
  remove: (note: AdminNote) => void;
  /** Save now whatever is waiting out the autosave delay. */
  flush: (id: string) => void;
  /** Leaving a note with nothing in it deletes it, quietly. */
  discardIfBlank: (id: string) => void;
};

const AUTOSAVE_MS = 500;
// Under the 64 KiB browsers allow for keepalive requests in flight at once.
const KEEPALIVE_BUDGET = 60_000;

const noteUrl = (id: string) => `/api/admin/notes/${id}`;

/**
 * The notes behind Ghi nhanh. Typing autosaves half a second after the last
 * key, and each note sends one request at a time. Every edit is stamped just
 * after the version it was made on, and the server keeps the newest, so a
 * save that arrives late (the keepalive as a tab closes, another tab) cannot
 * overwrite a newer one; when it loses, the newer version shows here too, and
 * a note deleted elsewhere leaves here. The list is fetched again when the tab
 * comes back or the panel opens again, but only while nothing here is waiting
 * to save.
 */
export function useNotesStore(enabled: boolean): NotesStore {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});

  // Read by timers and queued requests, never by render, so refs rather than state.
  const pending = useRef(new Map<string, AdminNote>()); // latest unsaved version of each note
  const latest = useRef(new Map<string, AdminNote>()); // newest version handed to a request
  const timers = useRef(new Map<string, number>());
  const queues = useRef(new Map<string, Promise<unknown>>()); // the request each note has in flight
  const inFlight = useRef(0); // requests queued or sent and not yet settled, all notes together
  const bodies = useRef(new Map<string, string>()); // latest text of each note still in the list
  const failing = useRef(new Set<string>()); // notes whose failure has been toasted already
  const accepted = useRef(new Map<string, string>()); // stamp of the version the server holds
  const clockRefused = useRef(new Set<string>()); // notes whose last stamp was refused as ahead
  const loaded = useRef(false); // the first list is in
  const changes = useRef(0); // counts changes made to the list here

  /** setNotes for a change made here, so a list fetched meanwhile knows it is stale. */
  const changeNotes = useCallback((update: (list: AdminNote[]) => AdminNote[]) => {
    changes.current += 1;
    setNotes(update);
  }, []);

  const setState = useCallback((id: string, state: SaveState | null) => {
    setSaveState((states) => {
      const next = { ...states };
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });
  }, []);

  /** Runs `request` once whatever this note already has in flight has settled. */
  const enqueue = useCallback(<T>(id: string, request: () => Promise<T>): Promise<T> => {
    inFlight.current += 1;
    const run = (queues.current.get(id) ?? Promise.resolve()).then(request);
    queues.current.set(
      id,
      run
        .catch(() => undefined)
        .finally(() => {
          inFlight.current -= 1;
        }),
    );
    return run;
  }, []);

  /**
   * The stamp for an edit of `note`: just after its version, unless the server
   * refused that stamp as ahead of its clock. Then just after the version the
   * server holds, so a clock put right is not held back by what it stamped
   * while it was wrong.
   */
  const stampFor = useCallback((note: AdminNote) => {
    if (!clockRefused.current.has(note.id)) return nextStamp(note.updated_at);
    clockRefused.current.delete(note.id);
    return nextStamp(accepted.current.get(note.id) ?? "");
  }, []);

  /** Drops the note from the list and from everything waiting to save it. */
  const forget = useCallback(
    (id: string) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      pending.current.delete(id);
      latest.current.delete(id);
      bodies.current.delete(id);
      failing.current.delete(id);
      accepted.current.delete(id);
      clockRefused.current.delete(id);
      setState(id, null);
      changeNotes((list) => list.filter((n) => n.id !== id));
    },
    [changeNotes, setState],
  );

  const flush = useCallback(
    (id: string) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      let note = pending.current.get(id);
      if (!note) return;
      pending.current.delete(id);
      if (clockRefused.current.has(id)) {
        // A retry after its stamp was refused as ahead of the server's clock:
        // stamp it again, now that the clock may have been put right.
        const restamped = { ...note, updated_at: stampFor(note) };
        changeNotes((list) => list.map((n) => (n.id === id ? restamped : n)));
        note = restamped;
      }
      const sent = note;
      latest.current.set(id, sent);
      setState(id, "saving");

      enqueue(id, () =>
        // Forgotten while this waited its turn (deleted here, or elsewhere):
        // sending it would put the row back.
        bodies.current.has(id)
          ? adminFetch<{ note: AdminNote }>(noteUrl(id), { method: "PUT", body: noteSaveBody(sent) })
          : Promise.reject(new Error("forgotten")),
      ).then(
        ({ note: stored }) => {
          clearAdminSession();
          failing.current.delete(id);
          // Deleted here meanwhile: nothing left to show.
          if (!bodies.current.has(id)) return;
          accepted.current.set(id, stored.updated_at);
          // An edit made while this was in flight reports its own state, and
          // its own save decides which version stays.
          if (pending.current.has(id)) return;
          setState(id, "saved");
          // The server kept a newer version, saved in another tab or on another
          // device: show that one.
          if (Date.parse(stored.updated_at) <= Date.parse(sent.updated_at)) return;
          bodies.current.set(id, stored.body);
          changeNotes((list) => list.map((n) => (n.id === id ? stored : n)));
          toast("Note này vừa được sửa ở nơi khác", { description: "Đang hiện bản mới hơn." });
        },
        (error) => {
          // Deleted here meanwhile: nothing left to save.
          if (!bodies.current.has(id)) return;
          const code = error instanceof AdminFetchError ? error.code : undefined;
          if (code === NOTE_DELETED) {
            // Deleted in another tab or on another device, the newest change of all.
            forget(id);
            toast("Note này vừa bị xoá ở nơi khác");
            return;
          }
          if (code === CLOCK_AHEAD) clockRefused.current.add(id);
          // Keep the text in line: the next keystroke, or a click on the dot,
          // retries. Only the newest version sent goes back, never an older
          // one whose failure came in after a newer one was sent.
          if (!pending.current.has(id) && latest.current.get(id) === sent) {
            pending.current.set(id, sent);
          }
          setState(id, "error");
          if (!failing.current.has(id)) {
            failing.current.add(id);
            reportAdminError(error, "Lưu note");
          }
        },
      );
    },
    [enqueue, setState, changeNotes, stampFor, forget],
  );

  const schedule = useCallback(
    (note: AdminNote) => {
      pending.current.set(note.id, note);
      bodies.current.set(note.id, note.body);
      setState(note.id, "dirty");
      window.clearTimeout(timers.current.get(note.id));
      timers.current.set(
        note.id,
        window.setTimeout(() => flush(note.id), AUTOSAVE_MS),
      );
    },
    [flush, setState],
  );

  /**
   * `background`: a refresh under a list already showing. It keeps that list
   * if it fails, and gives way to any change made here while it was loading.
   */
  const fetchNotes = useCallback(async (background = false) => {
    const changesBefore = changes.current;
    try {
      const data = await adminFetch<{ notes: AdminNote[] }>("/api/admin/notes");
      clearAdminSession();
      if (background && changes.current !== changesBefore) return;
      bodies.current = new Map(data.notes.map((note) => [note.id, note.body]));
      accepted.current = new Map(data.notes.map((note) => [note.id, note.updated_at]));
      setNotes(data.notes);
      loaded.current = true;
      setStatus("ready");
    } catch (error) {
      const kind = error instanceof AdminFetchError ? error.kind : null;
      if (background) {
        // The list already showing stays; only a lapsed session is worth a word.
        if (kind === "auth") reportAdminError(error, "Tải ghi nhanh");
        return;
      }
      setStatus(kind === "missing_table" ? "missing_table" : "error");
      if (kind !== "missing_table") reportAdminError(error, "Tải ghi nhanh");
    }
  }, []);

  /** The list again, once it has loaded, and only while nothing here is waiting to save. */
  const refresh = useCallback(() => {
    if (!loaded.current || pending.current.size > 0 || inFlight.current > 0) return;
    void fetchNotes(true);
  }, [fetchNotes]);

  // The first load once the panel is showing, then a refresh each time it
  // shows again. Status stays "idle" until the first answer is in, so nothing
  // sets state before the request goes out.
  const started = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (started.current) {
      refresh();
      return;
    }
    started.current = true;
    void fetchNotes();
  }, [enabled, fetchNotes, refresh]);

  // Back to this tab: another tab may have changed the notes meanwhile.
  useEffect(() => {
    if (!enabled) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, refresh]);

  // A tab closed inside the autosave delay would lose the last half second of
  // typing. keepalive lets those saves outlive the page; keepaliveSaves keeps
  // them under the browser's limit, newest edit first. A note whose stamp was
  // refused as ahead of the server's clock goes out stamped again.
  useEffect(() => {
    const onPageHide = () => {
      const unsaved = [...pending.current.values()].map((note) =>
        clockRefused.current.has(note.id)
          ? { ...note, updated_at: nextStamp(accepted.current.get(note.id) ?? "") }
          : note,
      );
      for (const save of keepaliveSaves(unsaved, KEEPALIVE_BUDGET)) {
        void fetch(noteUrl(save.id), {
          method: "PUT",
          body: save.body,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const create = useCallback(
    (body: string) => {
      const now = new Date().toISOString();
      const note: AdminNote = {
        id: crypto.randomUUID(),
        body,
        pinned: false,
        created_at: now,
        updated_at: now,
      };
      changeNotes((list) => [note, ...list]);
      schedule(note);
      return note;
    },
    [changeNotes, schedule],
  );

  const edit = useCallback(
    (note: AdminNote, body: string) => {
      const next = { ...note, body, updated_at: stampFor(note) };
      changeNotes((list) => list.map((n) => (n.id === note.id ? next : n)));
      schedule(next);
    },
    [changeNotes, schedule, stampFor],
  );

  const togglePin = useCallback(
    (note: AdminNote) => {
      const next = { ...note, pinned: !note.pinned, updated_at: stampFor(note) };
      changeNotes((list) => list.map((n) => (n.id === note.id ? next : n)));
      schedule(next);
      flush(next.id);
    },
    [changeNotes, schedule, flush, stampFor],
  );

  const restore = useCallback(
    (note: AdminNote) => {
      changeNotes((list) => [note, ...list.filter((n) => n.id !== note.id)]);
      schedule(note);
      flush(note.id);
    },
    [changeNotes, schedule, flush],
  );

  const remove = useCallback(
    (note: AdminNote) => {
      const acceptedStamp = accepted.current.get(note.id);
      forget(note.id);
      enqueue(note.id, () => adminFetch(noteUrl(note.id), { method: "DELETE" })).then(
        () => {
          clearAdminSession();
          toast.success("Đã xoá note", {
            action: { label: "Undo", onClick: () => restore(note) },
          });
        },
        (error) => {
          // Still on the server: back in the list, as the server knows it.
          bodies.current.set(note.id, note.body);
          if (acceptedStamp) accepted.current.set(note.id, acceptedStamp);
          changeNotes((list) => [note, ...list]);
          reportAdminError(error, "Xoá note");
        },
      );
    },
    [forget, enqueue, restore, changeNotes],
  );

  const discardIfBlank = useCallback(
    (id: string) => {
      const body = bodies.current.get(id);
      if (body === undefined || !isBlankNote(body)) return;
      forget(id);
      // The row may not exist yet; deleting nothing is fine.
      void enqueue(id, () => adminFetch(noteUrl(id), { method: "DELETE" })).catch(() => undefined);
    },
    [forget, enqueue],
  );

  const reload = useCallback(() => {
    setStatus("loading");
    void fetchNotes();
  }, [fetchNotes]);

  return useMemo(
    () => ({
      status,
      notes,
      saveState,
      reload,
      create,
      edit,
      togglePin,
      remove,
      flush,
      discardIfBlank,
    }),
    [status, notes, saveState, reload, create, edit, togglePin, remove, flush, discardIfBlank],
  );
}
