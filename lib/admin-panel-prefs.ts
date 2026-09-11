/**
 * Which side panel is open in /admin (components/admin/side-panel). Stored as
 * a bare string, not JSON, because the head script in app/layout.tsx reads it
 * before first paint and has to stay tiny. Also a small external store, so
 * the provider can read it with useSyncExternalStore.
 *
 * Each tab keeps its own choice once loaded, as Edge's sidebar does; storage
 * only carries it to the next page load. Reading storage live would let
 * another tab, or a write the storage refused, change the snapshot without
 * a notification, and useSyncExternalStore depends on being told.
 */

export const ADMIN_PANEL_IDS = ["calendar", "tasks", "notes"] as const;

export type AdminPanelId = (typeof ADMIN_PANEL_IDS)[number];

export const ADMIN_PANEL_KEY = "ttqteo:admin-panel:v1";

/** Fired by the toolbar's phone-only button; the side panel provider listens. */
export const OPEN_ADMIN_SHEET_EVENT = "ttqteo:open-admin-sheet";

export function isAdminPanelId(value: unknown): value is AdminPanelId {
  return typeof value === "string" && (ADMIN_PANEL_IDS as readonly string[]).includes(value);
}

// This tab's choice: loaded from storage on the first read, then changed only
// by writeAdminPanel. undefined until that first read.
let current: AdminPanelId | null | undefined;
const listeners = new Set<() => void>();

export function readAdminPanel(): AdminPanelId | null {
  if (typeof window === "undefined") return null;
  if (current === undefined) {
    try {
      const value = window.localStorage.getItem(ADMIN_PANEL_KEY);
      current = isAdminPanelId(value) ? value : null;
    } catch {
      current = null;
    }
  }
  return current;
}

export function writeAdminPanel(panel: AdminPanelId | null): void {
  if (typeof window === "undefined") return;
  current = panel;
  try {
    if (panel) window.localStorage.setItem(ADMIN_PANEL_KEY, panel);
    else window.localStorage.removeItem(ADMIN_PANEL_KEY);
  } catch {
    /* blocked or full: this tab still has it in `current` */
  }
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore: `listener` runs after every writeAdminPanel. */
export function subscribeAdminPanel(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Appended to the head script in app/layout.tsx, after its try block, in a
 * try of its own: a failure earlier in that script cannot stop it, and a
 * blocked storage here cannot break the page. Marks <html> with the open
 * panel so the padding that makes room for it applies from the first frame,
 * not after hydration. Outside /admin nothing reads the attribute.
 */
export const ADMIN_PANEL_HEAD_SNIPPET =
  `try{var ap=localStorage.getItem(${JSON.stringify(ADMIN_PANEL_KEY)});` +
  `if(${JSON.stringify(ADMIN_PANEL_IDS)}.indexOf(ap)>-1)` +
  `document.documentElement.dataset.adminPanel=ap;}catch(e){}`;
