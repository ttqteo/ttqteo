/**
 * Turning a URL into the fields a link card shows.
 *
 * Everything here is pure: parsing, merging and the address checks. The network
 * lives in `app/api/admin/unfurl/route.ts`, which composes these. That split is
 * what lets the interesting cases — malformed OG tags, the oEmbed/OG precedence
 * table, the SSRF host list — be tested against fixtures instead of the live web.
 */

export type Provider = {
  name: string;
  /** Matched against the hostname, never a substring of the whole URL. */
  hosts: RegExp;
  oembed: (url: string) => string;
  /**
   * Whether an iframe of this provider actually renders. Most of the web sends
   * `X-Frame-Options: DENY`, which fails as a silent blank box, so Embed is
   * offered only where it is known to work.
   */
  embeddable: boolean;
};

/**
 * Only providers verified by hand against a real URL belong here. An endpoint
 * copied from documentation and never exercised is worse than no entry: it
 * fails at the moment the author is trying to write.
 */
export const PROVIDERS: Provider[] = [
  {
    name: "YouTube",
    hosts: /^(?:(?:www|m|music)\.)?youtube(?:-nocookie)?\.com$|^youtu\.be$/i,
    oembed: (url) =>
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    embeddable: true,
  },
];

export function providerFor(url: string): Provider | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  return PROVIDERS.find((p) => p.hosts.test(host)) ?? null;
}

/* ------------------------------------------------------------------ parsing */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();
    try {
      if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16));
      if (key.startsWith("#")) return String.fromCodePoint(parseInt(key.slice(1), 10));
    } catch {
      return match;
    }
    return NAMED_ENTITIES[key] ?? match;
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads one `<meta>` value. Attribute order varies in the wild — `content` can
 * come before `property` — so the tag is located first and its `content` read
 * second, rather than trying to match both in one ordered pattern.
 */
export function metaContent(html: string, key: string): string | null {
  const tag = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${escapeRegex(key)}["'][^>]*>`,
    "i",
  ).exec(html)?.[0];
  if (!tag) return null;

  const raw =
    /content\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ??
    /content\s*=\s*'([^']*)'/i.exec(tag)?.[1] ??
    /content\s*=\s*([^\s>]+)/i.exec(tag)?.[1];
  if (raw == null) return null;

  const value = decodeEntities(raw).trim();
  return value || null;
}

export function titleTag(html: string): string | null {
  const raw = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (raw == null) return null;
  const value = decodeEntities(raw).replace(/\s+/g, " ").trim();
  return value || null;
}

export function absoluteUrl(value: string | null | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * `<link rel="icon">` in preference order, falling back to the well-known
 * location every browser probes anyway.
 */
export function faviconHref(html: string, baseUrl: string): string | null {
  const links = html.match(/<link[^>]+>/gi) ?? [];
  const byRel = (test: (rel: string) => boolean): string | null => {
    for (const tag of links) {
      const rel = /rel\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]?.toLowerCase();
      if (!rel || !test(rel)) continue;
      const href = /href\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
      const resolved = absoluteUrl(href ? decodeEntities(href) : null, baseUrl);
      if (resolved) return resolved;
    }
    return null;
  };

  return (
    byRel((rel) => rel.split(/\s+/).includes("icon")) ??
    byRel((rel) => rel.includes("shortcut")) ??
    byRel((rel) => rel.includes("apple-touch-icon")) ??
    absoluteUrl("/favicon.ico", baseUrl)
  );
}

export type OpenGraph = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

/** OpenGraph first, Twitter cards as the fallback for sites that only ship those. */
export function parseOpenGraph(html: string, baseUrl: string): OpenGraph {
  return {
    title: metaContent(html, "og:title") ?? metaContent(html, "twitter:title"),
    description:
      metaContent(html, "og:description") ??
      metaContent(html, "twitter:description") ??
      metaContent(html, "description"),
    image: absoluteUrl(
      metaContent(html, "og:image") ??
        metaContent(html, "og:image:url") ??
        metaContent(html, "twitter:image"),
      baseUrl,
    ),
    siteName: metaContent(html, "og:site_name"),
  };
}

export type OEmbed = {
  title?: string;
  author_name?: string;
  provider_name?: string;
  thumbnail_url?: string;
  html?: string;
};

/**
 * The `src` out of a provider's iframe, not the iframe itself. Storing only the
 * src means the embed's own attributes stay ours to set, and a provider changing
 * its markup cannot retroactively alter published posts.
 */
export function extractIframeSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const iframe = /<iframe[^>]*>/i.exec(html)?.[0];
  if (!iframe) return null;
  const src =
    /src\s*=\s*"([^"]*)"/i.exec(iframe)?.[1] ??
    /src\s*=\s*'([^']*)'/i.exec(iframe)?.[1];
  if (!src) return null;
  const resolved = decodeEntities(src);
  return /^https?:\/\//i.test(resolved) ? resolved : null;
}

/* ------------------------------------------------------------------- merging */

export type UnfurlResult = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  embedSrc: string | null;
  /** Whether the paste menu should offer Embed at all. */
  embeddable: boolean;
};

/**
 * oEmbed and OpenGraph are merged, not chosen between: neither alone produces a
 * full card. oEmbed carries the title and the iframe but no description; OG
 * carries the description and a larger image. Verified against YouTube on
 * 2026-09-07 and recorded in the spec's precedence table.
 */
export function mergeUnfurl(input: {
  url: string;
  oembed?: OEmbed | null;
  og?: OpenGraph | null;
  titleFallback?: string | null;
  favicon?: string | null;
  provider?: Provider | null;
}): UnfurlResult {
  const { url, oembed, og, titleFallback, favicon, provider } = input;
  const embedSrc = extractIframeSrc(oembed?.html);

  let host: string | null = null;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* leave null */
  }

  return {
    url,
    title: oembed?.title?.trim() || og?.title || titleFallback || null,
    // OG is the only source of a description; oEmbed has no such field.
    description: og?.description ?? null,
    // OG images are the larger of the two (maxres vs. the oEmbed thumbnail).
    image: og?.image ?? oembed?.thumbnail_url ?? null,
    favicon: favicon ?? null,
    siteName: og?.siteName ?? oembed?.provider_name ?? provider?.name ?? host,
    embedSrc,
    embeddable: Boolean(provider?.embeddable && embedSrc),
  };
}

/* --------------------------------------------------------------- SSRF guard */

/**
 * Addresses the unfurl fetcher must never reach. The route is admin-only, so
 * the exposure is small, but the check is cheap and a public URL is free to
 * redirect at 127.0.0.1.
 */
export function isBlockedAddress(ip: string): boolean {
  const value = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!value) return true;

  if (value.includes(":")) {
    if (value === "::" || value === "::1") return true;
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
    if (mapped) return isBlockedAddress(mapped[1]);
    if (/^f[cd]/.test(value)) return true; // unique local, fc00::/7
    if (/^fe[89ab]/.test(value)) return true; // link local, fe80::/10
    return false;
  }

  const octets = value.split(".");
  // Anything that is not a dotted quad reached this by mistake; refuse it.
  if (octets.length !== 4) return true;
  const numbers = octets.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  if (numbers.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;

  const [a, b] = numbers;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link local
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

/** Hostnames rejected before DNS is even consulted. */
export function isBlockedHostname(host: string): boolean {
  const value = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!value) return true;
  if (value === "localhost" || value.endsWith(".localhost")) return true;
  if (value.endsWith(".local") || value.endsWith(".internal")) return true;
  // A literal address in the URL skips name resolution, so check it here too.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(":")) {
    return isBlockedAddress(value);
  }
  return false;
}

/**
 * The URL a paste consists of *entirely*, or null for anything else. Pasting a
 * sentence that happens to mention a link must stay a sentence, so this is
 * deliberately strict: no surrounding text, no whitespace, http(s) only.
 *
 * The original text is returned rather than `URL.toString()`, which would
 * normalise the author's URL out from under them.
 */
export function bareUrl(text: string | null | undefined): string | null {
  const value = text?.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
