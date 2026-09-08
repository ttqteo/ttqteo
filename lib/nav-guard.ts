/**
 * Which link clicks an unsaved-changes guard should stop and ask about.
 *
 * The App Router has no navigation event to hook, so the guard listens for
 * clicks in the capture phase instead. That listener sees *every* anchor on the
 * page — the admin nav, the editor's own back arrow, links inside pasted post
 * content — so deciding what counts as leaving is where the bugs would be. It
 * lives here, away from the DOM plumbing, to be tested directly.
 */

export type ClickModifiers = Pick<
  MouseEvent,
  "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
>;

/**
 * Returns the in-app path this click would navigate to, or null when the click
 * is none of the guard's business: a new tab, a download, another origin, or a
 * jump within the page the author is already on.
 */
export function navigationTarget(
  anchor: HTMLAnchorElement,
  currentUrl: string,
  event: ClickModifiers,
): string | null {
  // Middle click, ctrl-click and friends open somewhere else; the editor stays
  // put and has nothing to warn about.
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  if (anchor.hasAttribute("download")) return null;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return null;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;

  let url: URL;
  let current: URL;
  try {
    current = new URL(currentUrl);
    url = new URL(href, currentUrl);
  } catch {
    return null;
  }

  // `mailto:` and the like leave the page to the OS, which the browser's own
  // beforeunload prompt already covers.
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.origin !== current.origin) return null;
  // Same page, different hash or query: not leaving.
  if (url.pathname === current.pathname) return null;

  return url.pathname + url.search;
}
