"use client";

import { useIsAdmin } from "@/components/contexts/admin-context";
import {
  OPEN_ADMIN_SHEET_EVENT,
  readAdminPanel,
  shortcutPanel,
  subscribeAdminPanel,
  writeAdminPanel,
  type AdminPanelId,
} from "@/lib/admin-panel-prefs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { useNotesStore, type NotesStore } from "./use-notes-store";
import { useTasksStore, type TasksStore } from "./use-tasks-store";

type SidePanelContextValue = {
  /** The open panel, on screens with room for the rail; null when closed. */
  panel: AdminPanelId | null;
  /** True when the panel was opened by a click or a shortcut, not restored on load. */
  openedByUser: boolean;
  toggle: (id: AdminPanelId) => void;
  close: () => void;
  /** The bottom sheet that stands in for rail and panel under 768px. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  sheetTab: AdminPanelId;
  setSheetTab: (id: AdminPanelId) => void;
  tasks: TasksStore;
  notes: NotesStore;
  /** Marks an element, portalled popovers included, as focus inside the panel. */
  notePanelFocus: (el: HTMLElement) => void;
};

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export function useSidePanel(): SidePanelContextValue {
  const value = useContext(SidePanelContext);
  if (!value) throw new Error("useSidePanel needs SidePanelProvider");
  return value;
}

// Tailwind's max-md, the exact complement of md (min-width: 768px). A plain
// (max-width: 767px) leaves a gap at fractional widths such as 767.2px, which
// a 125% display scale produces, where neither the rail nor the sheet works.
const PHONE_QUERY = "not all and (min-width: 768px)";
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
const closedOnServer = () => null;

export function SidePanelProvider({ children }: PropsWithChildren) {
  const admin = useIsAdmin();
  // Seeded from the mark the head script put on <html> before first paint,
  // so the panel and the room made for it always agree.
  const panel = useSyncExternalStore(subscribeAdminPanel, readAdminPanel, closedOnServer);
  const [openedByUser, setOpenedByUser] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<AdminPanelId>("tasks");
  // Where focus goes back to when the panel closes: whatever had it when the
  // panel opened (the editor, mid-sentence, after Alt+3), else the rail.
  const returnFocus = useRef<HTMLElement | null>(null);
  // The last element inside the panel to report focus, portalled popovers
  // included: React focus events bubble through a portal even though the DOM
  // node itself renders outside .admin-side-panel.
  const lastPanelFocus = useRef<HTMLElement | null>(null);

  const notePanelFocus = useCallback((el: HTMLElement) => {
    lastPanelFocus.current = el;
  }, []);

  const apply = useCallback((next: AdminPanelId | null) => {
    const previous = readAdminPanel();
    const focused = document.activeElement;
    const active = focused instanceof HTMLElement && focused !== document.body ? focused : null;
    const inSidebar =
      active?.closest(".admin-side-panel, .admin-side-rail") != null ||
      (active !== null && active === lastPanelFocus.current);
    const focusInPanel =
      active?.closest(".admin-side-panel") != null ||
      (active !== null && active === lastPanelFocus.current);
    // Record where focus was every time a panel opens or switches, as long as
    // it was outside the sidebar: that is where the user actually was when
    // they pressed the shortcut, so Esc after a switch never lands on the
    // rail icon of a panel that is no longer open.
    if (next && active && !inSidebar) returnFocus.current = active;

    setOpenedByUser(next !== null);
    writeAdminPanel(next);
    const root = document.documentElement;
    if (next) root.dataset.adminPanel = next;
    else delete root.dataset.adminPanel;

    // preventScroll throughout: a plain focus() on the editor can scroll the
    // page to its start before ProseMirror puts the caret back.
    if (next) {
      // A switch unmounts the content under the cursor. The close button
      // stays mounted across switches, so focus waits there: Calendar has no
      // field of its own, and Task and Ghi nhanh move it on to theirs.
      if (focusInPanel && next !== previous) {
        document.querySelector<HTMLElement>("[data-panel-close]")?.focus({ preventScroll: true });
      }
      return;
    }
    // Closing hides the panel under the cursor; hand focus back rather than
    // let it fall to <body>.
    if (focusInPanel) {
      const rail = document.querySelector<HTMLElement>(`.admin-side-rail [data-panel="${previous}"]`);
      const back = returnFocus.current?.isConnected ? returnFocus.current : rail;
      back?.focus({ preventScroll: back.isContentEditable });
      // An opener hidden or disabled since then cannot take focus: use the rail.
      if (document.activeElement !== back) rail?.focus({ preventScroll: true });
    }
    returnFocus.current = null;
  }, []);

  const toggle = useCallback(
    (id: AdminPanelId) => apply(readAdminPanel() === id ? null : id),
    [apply],
  );
  const close = useCallback(() => apply(null), [apply]);

  // Alt+1/2/3 (shortcutPanel). On a phone they open the sheet instead. In
  // focus mode, which hides rail and panel, they do nothing.
  useEffect(() => {
    if (!admin) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const id = shortcutPanel(event);
      if (!id || document.body.classList.contains("focus-mode")) return;
      event.preventDefault();
      if (isPhone()) {
        setSheetTab(id);
        setSheetOpen(true);
      } else {
        toggle(id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [admin, toggle]);

  // The toolbar is in the root layout, outside this provider, so its phone
  // button reaches the sheet through an event. Only where the sheet can show:
  // opened at 768px or wider it would leave its overlay up over nothing.
  useEffect(() => {
    const open = () => {
      if (isPhone()) setSheetOpen(true);
    };
    window.addEventListener(OPEN_ADMIN_SHEET_EVENT, open);
    return () => window.removeEventListener(OPEN_ADMIN_SHEET_EVENT, open);
  }, []);

  // The sheet is hidden from 768px up; widening the window with it open would
  // leave its overlay behind with nothing on it.
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => {
      if (!query.matches) setSheetOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Tasks load as soon as the owner is known: the rail badge needs them.
  const tasks = useTasksStore(admin);
  const notesShowing = panel === "notes" || (sheetOpen && sheetTab === "notes");
  const notes = useNotesStore(admin && notesShowing);

  const value = useMemo(
    () => ({
      panel,
      openedByUser,
      toggle,
      close,
      sheetOpen,
      setSheetOpen,
      sheetTab,
      setSheetTab,
      tasks,
      notes,
      notePanelFocus,
    }),
    [panel, openedByUser, toggle, close, sheetOpen, sheetTab, tasks, notes, notePanelFocus],
  );

  return <SidePanelContext.Provider value={value}>{children}</SidePanelContext.Provider>;
}
