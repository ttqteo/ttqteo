/**
 * The links inside a Ghi nhanh note. A note is plain text, so a link is
 * whatever in it reads as an http(s) URL; these helpers find them and give
 * each a short label for a card or a chip. Pure, so the edge cases (trailing
 * punctuation, a bracket the URL itself opened, a Vietnamese slug) live here
 * and in the tests, not in the panel.
 */

/** Everything a URL can run into before whitespace; the tail is trimmed after. */
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

/** Characters a sentence puts after a link that are never part of it. */
const TRAILING = /[.,;:!?'"]+$/;

const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

/**
 * Trims what a sentence added after the URL: punctuation, and a closing
 * bracket with no opening one inside the URL, so `(https://a.com/x)` gives
 * `https://a.com/x` while a Wikipedia `Foo_(bar)` keeps its bracket.
 */
function trimUrl(raw: string): string {
  const count = (text: string, char: string) => text.split(char).length - 1;
  let url = raw;
  for (;;) {
    const trimmed = url.replace(TRAILING, "");
    const last = trimmed[trimmed.length - 1];
    const opener = last ? CLOSERS[last] : undefined;
    const balanced = opener === undefined || count(trimmed, opener) >= count(trimmed, last);
    const next = balanced ? trimmed : trimmed.slice(0, -1);
    if (next === url) return url;
    url = next;
  }
}

export type LinkPart = { kind: "text"; text: string } | { kind: "link"; url: string };

/** A line split into its text and its links, in order, for rendering chips inline. */
export function splitLinks(text: string): LinkPart[] {
  const parts: LinkPart[] = [];
  let at = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    const start = match.index;
    if (start > at) parts.push({ kind: "text", text: text.slice(at, start) });
    parts.push({ kind: "link", url });
    at = start + url.length;
  }
  if (at < text.length) parts.push({ kind: "text", text: text.slice(at) });
  return parts;
}

/** Every URL in the note, in order of first appearance, once each. */
export function extractLinks(body: string): string[] {
  const seen = new Set<string>();
  for (const part of splitLinks(body)) {
    if (part.kind === "link") seen.add(part.url);
  }
  return [...seen];
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * What a chip shows for a URL: the host without `www.`, then the path without
 * its trailing slash, query or fragment. `?fbclid=…` is noise to a reader, and
 * a percent-encoded Vietnamese slug reads better decoded.
 */
export function linkLabel(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  const path = decodePath(parsed.pathname).replace(/\/+$/, "");
  return host + path;
}
