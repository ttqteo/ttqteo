/**
 * A local snapshot of whatever is in the editor, so closing the tab or hitting
 * F5 before pressing Save does not lose the writing.
 *
 * localStorage rather than sessionStorage: sessionStorage dies with the tab,
 * which is exactly the case worth protecting against. One slot per post so a
 * draft opened in a second tab cannot clobber the first.
 */

export type EditorDraftBody = {
  title: string;
  description: string;
  content: string;
  tags: string;
  slug: string;
};

export type EditorDraft = EditorDraftBody & { savedAt: number };

const PREFIX = "ttqteo:editor-draft:";
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function draftKey(postId: string | null | undefined): string {
  return `${PREFIX}${postId ?? "new"}`;
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function saveEditorDraft(
  postId: string | null | undefined,
  body: EditorDraftBody,
  now: number = Date.now(),
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      draftKey(postId),
      JSON.stringify({ ...body, savedAt: now }),
    );
  } catch {
    // Quota or a browser with storage blocked. Autosave is best-effort; the
    // manual Save button is still there.
  }
}

export function readEditorDraft(
  postId: string | null | undefined,
  now: number = Date.now(),
): EditorDraft | null {
  if (typeof window === "undefined") return null;
  const key = draftKey(postId);
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<EditorDraft>;
    if (!parsed || typeof parsed.savedAt !== "number") {
      safeRemove(key);
      return null;
    }
    if (now - parsed.savedAt > DRAFT_TTL_MS) {
      safeRemove(key);
      return null;
    }
    return {
      title: parsed.title ?? "",
      description: parsed.description ?? "",
      content: parsed.content ?? "",
      tags: parsed.tags ?? "",
      slug: parsed.slug ?? "",
      savedAt: parsed.savedAt,
    };
  } catch {
    safeRemove(key);
    return null;
  }
}

export function clearEditorDraft(postId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  safeRemove(draftKey(postId));
}

/**
 * Whether a stored draft is worth offering to restore.
 *
 * The slug is left out on purpose: a new post regenerates it with a fresh
 * random suffix on every mount, so including it would raise the restore banner
 * over a draft identical in every way that matters.
 */
export function draftDiffersFrom(draft: EditorDraft, current: EditorDraftBody): boolean {
  return (
    draft.title !== current.title ||
    draft.description !== current.description ||
    draft.content !== current.content ||
    draft.tags !== current.tags
  );
}
