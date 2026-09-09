/**
 * How the writing surface is laid out. Persisted so the editor opens the way it
 * was left, the same way the tldraw panel already remembers its own toggle.
 */

export type EditorWidth = "narrow" | "wide";
export type EditorAlign = "center" | "left";

export type EditorPrefs = {
  showToc: boolean;
  width: EditorWidth;
  align: EditorAlign;
};

export const EDITOR_PREFS_KEY = "ttqteo:editor-prefs";

export const DEFAULT_EDITOR_PREFS: EditorPrefs = {
  // Off by default: while writing, the outline is a thing you consult
  // occasionally, not something worth a permanent column. The layout popover
  // brings it back.
  showToc: false,
  width: "narrow",
  align: "center",
};

const WIDTHS: readonly EditorWidth[] = ["narrow", "wide"];
const ALIGNS: readonly EditorAlign[] = ["center", "left"];

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function readEditorPrefs(): EditorPrefs {
  if (typeof window === "undefined") return DEFAULT_EDITOR_PREFS;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(EDITOR_PREFS_KEY);
  } catch {
    return DEFAULT_EDITOR_PREFS;
  }
  if (!raw) return DEFAULT_EDITOR_PREFS;

  try {
    const parsed = JSON.parse(raw) as Partial<EditorPrefs>;
    return {
      showToc:
        typeof parsed?.showToc === "boolean"
          ? parsed.showToc
          : DEFAULT_EDITOR_PREFS.showToc,
      width: pick(parsed?.width, WIDTHS, DEFAULT_EDITOR_PREFS.width),
      align: pick(parsed?.align, ALIGNS, DEFAULT_EDITOR_PREFS.align),
    };
  } catch {
    return DEFAULT_EDITOR_PREFS;
  }
}

export function writeEditorPrefs(prefs: EditorPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EDITOR_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
