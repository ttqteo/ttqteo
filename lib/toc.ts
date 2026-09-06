import GithubSlugger from "github-slugger";

export type TocEntry = { level: number; text: string; href: string };

/**
 * One slug algorithm for the whole blog. MDX headings get their ids from
 * `rehype-slug`, which is github-slugger, so every other reader of a heading —
 * the TOC, and the ids we inject into editor HTML — has to agree with it.
 */
const HTML_HEADING = /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;

function headingText(inner: string): string {
  return inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Fenced code contains `#` comments that are not headings. */
function stripFencedCode(raw: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of raw.split("\n")) {
    const marker = /^\s*(```+|~~~+)/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

export function tocFromMarkdown(raw: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const out: TocEntry[] = [];
  const regex = /^(#{2,4})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stripFencedCode(raw))) !== null) {
    const text = match[2].trim();
    if (!text) continue;
    out.push({ level: match[1].length, text, href: `#${slugger.slug(text)}` });
  }
  return out;
}

export function tocFromHtml(html: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const out: TocEntry[] = [];
  let match: RegExpExecArray | null;
  HTML_HEADING.lastIndex = 0;
  while ((match = HTML_HEADING.exec(html)) !== null) {
    const text = headingText(match[3]);
    if (!text) continue;
    out.push({
      level: parseInt(match[1], 10),
      text,
      href: `#${slugger.slug(text)}`,
    });
  }
  return out;
}

export function injectHeadingIds(html: string): string {
  const slugger = new GithubSlugger();
  return html.replace(HTML_HEADING, (whole, level, attrs, inner) => {
    const text = headingText(inner);
    if (!text) return whole;
    // Slug every heading so the dedupe counter stays in step with `tocFromHtml`,
    // even where the heading already carries a hand-written id.
    const slug = slugger.slug(text);
    const hasId = / id\s*=\s*["'][^"']*["']/.test(attrs);
    const newAttrs = hasId ? attrs : `${attrs} id="${slug}"`;
    return `<h${level}${newAttrs}>${inner}</h${level}>`;
  });
}
