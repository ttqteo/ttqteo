"use client";

import { useIsAdmin } from "@/components/contexts/admin-context";
import {
  OPEN_ADMIN_SHEET_EVENT,
  readAdminPanel,
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
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { PANELS } from "./panels";

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
};

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export function useSidePanel(): SidePanelContextValue {
  const value = useContext(SidePanelContext);
  if (!value) throw new Error("useSidePanel needs SidePanelProvider");
  return value;
}

const PHONE_QUERY = "(max-width: 767px)";
const SHORTCUT_CODES = ["Digit1", "Digit2", "Digit3"];
const closedOnServer = () => null;

export function SidePanelProvider({ children }: PropsWithChildren) {
  const admin = useIsAdmin();
  // Seeded from the mark the head script put on <html> before first paint,
  // so the panel and the room made for it always agree.
  const panel = useSyncExternalStore(subscribeAdminPanel, readAdminPanel, closedOnServer);
  const [openedByUser, setOpenedByUser] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<AdminPanelId>("tasks");

  const apply = useCallback((next: AdminPanelId | null) => {
    setOpenedByUser(next !== null);
    writeAdminPanel(next);
    const root = document.documentElement;
    if (next) root.dataset.adminPanel = next;
    else delete root.dataset.adminPanel;
  }, []);

  const toggle = useCallback(
    (id: AdminPanelId) => apply(readAdminPanel() === id ? null : id),
    [apply],
  );
  const close = useCallback(() => apply(null), [apply]);

  // Alt+1/2/3 in rail order. On a phone they open the sheet instead.
  useEffect(() => {
    if (!admin) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = SHORTCUT_CODES.indexOf(event.code);
      if (index === -1) return;
      event.preventDefault();
      const id = PANELS[index].id;
      if (window.matchMedia(PHONE_QUERY).matches) {
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
  // button reaches the sheet through an event.
  useEffect(() => {
    const open = () => setSheetOpen(true);
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

  const value = useMemo(
    () => ({ panel, openedByUser, toggle, close, sheetOpen, setSheetOpen, sheetTab, setSheetTab }),
    [panel, openedByUser, toggle, close, sheetOpen, sheetTab],
  );

  return <SidePanelContext.Provider value={value}>{children}</SidePanelContext.Provider>;
}
