/**
 * Which side panel is open in /admin (components/admin/side-panel). Stored as
 * a bare string, not JSON, because the head script in app/layout.tsx reads it
 * before first paint and has to stay tiny. Also a small external store, so
 * the provider can read it with useSyncExternalStore.
 */

export type AdminPanelId = "calendar" | "tasks" | "notes";

export const ADMIN_PANEL_IDS: readonly AdminPanelId[] = ["calendar", "tasks", "notes"];

export const ADMIN_PANEL_KEY = "ttqteo:admin-panel:v1";

/** Fired by the toolbar's phone-only button; the side panel provider listens. */
export const OPEN_ADMIN_SHEET_EVENT = "ttqteo:open-admin-sheet";

export function isAdminPanelId(value: unknown): value is AdminPanelId {
  return typeof value === "string" && (ADMIN_PANEL_IDS as readonly string[]).includes(value);
}

// Where the choice lives when storage is blocked, so the rail still works for this page.
let inMemory: AdminPanelId | null = null;
const listeners = new Set<() => void>();

export function readAdminPanel(): AdminPanelId | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ADMIN_PANEL_KEY);
    return isAdminPanelId(value) ? value : null;
  } catch {
    return inMemory;
  }
}

export function writeAdminPanel(panel: AdminPanelId | null): void {
  if (typeof window === "undefined") return;
  inMemory = panel;
  try {
    if (panel) window.localStorage.setItem(ADMIN_PANEL_KEY, panel);
    else window.localStorage.removeItem(ADMIN_PANEL_KEY);
  } catch {
    /* blocked: inMemory carries it */
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
 * Spliced into the head script in app/layout.tsx, inside its try block and
 * with its `r` (document.documentElement) in scope. Marks <html> with the
 * open panel so the padding that makes room for it applies from the first
 * frame, not after hydration. Outside /admin nothing reads the attribute.
 */
export const ADMIN_PANEL_HEAD_SNIPPET =
  `var ap=localStorage.getItem(${JSON.stringify(ADMIN_PANEL_KEY)});` +
  `if(${JSON.stringify(ADMIN_PANEL_IDS)}.indexOf(ap)>-1)r.dataset.adminPanel=ap;`;
