# Link Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasting a URL into the post editor can become a Notion-style bookmark card or, for allowlisted providers, an embedded player.

**Architecture:** A pure metadata module (`lib/unfurl.ts`) does all parsing and merging with no network calls, so it is fully unit-testable. A thin admin-only API route wraps it with the actual `fetch`. A single tiptap node (`linkCard`) with a `mode` attribute serialises to semantic HTML that the public page already renders via `dangerouslySetInnerHTML`. Styling lives in `globals.css` because Tailwind cannot see classes that exist only in database strings.

**Tech Stack:** Next.js App Router, tiptap v3.23, vitest 4 + happy-dom, Tailwind 3, Supabase.

**Spec:** `docs/superpowers/specs/2026-09-07-link-card-design.md`

## Global Constraints

- **Semantic class names only in emitted HTML.** `tailwind.config.ts` scans `./app`, `./components`, `./src` for `.ts`/`.tsx`. A utility class that exists only inside stored HTML gets no CSS generated. All card styling goes in `app/globals.css`, where `@apply` is available.
- **The format contract is the `data-link-card` attribute**, never a class name. `parseHTML` matches on the attribute.
- **tiptap is v3** (`^3.23.4`). v2 examples found online will not apply directly; `BubbleMenu` is imported from `@tiptap/react/menus`.
- **No network in tests.** Provider endpoints are verified once by hand, not in CI.
- **All new API routes are admin-only**, guarded with `isAdmin()` from `@/lib/supabase-server` as the first statement.
- Tests use `describe`/`it`/`expect` imported explicitly from `vitest`, matching `lib/tags.test.ts`.

---

### Task 1: Unfurl parsing core

Pure functions only. No `fetch`, no provider knowledge.

**Files:**
- Create: `lib/unfurl.ts`
- Test: `lib/unfurl.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type UnfurlResult = { url: string; title: string | null; description: string | null; image: string | null; favicon: string | null; siteName: string | null; author: string | null; embedSrc: string | null; embeddable: boolean }`
  - `decodeEntities(s: string): string`
  - `metaContent(html: string, key: string): string | null`
  - `absoluteUrl(href: string | null, base: string): string | null`
  - `isBlockedHost(host: string): boolean`
  - `parseHtmlMeta(html: string, pageUrl: string): Partial<UnfurlResult>`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/unfurl.test.ts
import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  decodeEntities,
  isBlockedHost,
  metaContent,
  parseHtmlMeta,
} from "@/lib/unfurl";

describe("decodeEntities", () => {
  it("decodes the entities that appear in og:title", () => {
    expect(decodeEntities("Vibe Coding &amp; Linux")).toBe("Vibe Coding & Linux");
    expect(decodeEntities("&lt;script&gt; &quot;x&quot; &#39;y&#39;")).toBe(
      "<script> \"x\" 'y'",
    );
  });
});

describe("metaContent", () => {
  it("reads content that follows the property attribute", () => {
    const html = `<meta property="og:title" content="Hello">`;
    expect(metaContent(html, "og:title")).toBe("Hello");
  });

  it("reads content that precedes the property attribute", () => {
    const html = `<meta content="Hello" property="og:title">`;
    expect(metaContent(html, "og:title")).toBe("Hello");
  });

  it("accepts name= as well as property=, for twitter: tags", () => {
    const html = `<meta name="twitter:image" content="https://x/a.png">`;
    expect(metaContent(html, "twitter:image")).toBe("https://x/a.png");
  });

  it("returns null when the tag is absent", () => {
    expect(metaContent("<html></html>", "og:title")).toBeNull();
  });

  it("does not match a longer key that merely starts the same", () => {
    const html = `<meta property="og:image:width" content="1280">`;
    expect(metaContent(html, "og:image")).toBeNull();
  });
});

describe("absoluteUrl", () => {
  it("resolves a root-relative favicon", () => {
    expect(absoluteUrl("/favicon.ico", "https://a.com/b/c")).toBe(
      "https://a.com/favicon.ico",
    );
  });

  it("leaves an absolute url alone", () => {
    expect(absoluteUrl("https://cdn.x/i.png", "https://a.com")).toBe(
      "https://cdn.x/i.png",
    );
  });

  it("returns null for null input and for garbage", () => {
    expect(absoluteUrl(null, "https://a.com")).toBeNull();
    expect(absoluteUrl("::::", "not a url")).toBeNull();
  });
});

describe("isBlockedHost", () => {
  it("blocks loopback and link-local", () => {
    for (const h of ["localhost", "127.0.0.1", "127.1.2.3", "169.254.169.254", "::1"]) {
      expect(isBlockedHost(h)).toBe(true);
    }
  });

  it("blocks RFC1918 ranges including the whole 172.16/12 block", () => {
    for (const h of ["10.0.0.1", "192.168.1.1", "172.16.0.1", "172.31.255.255"]) {
      expect(isBlockedHost(h)).toBe(true);
    }
  });

  it("does not block 172.32, which is public", () => {
    expect(isBlockedHost("172.32.0.1")).toBe(false);
  });

  it("allows ordinary hosts", () => {
    expect(isBlockedHost("www.youtube.com")).toBe(false);
  });
});

describe("parseHtmlMeta", () => {
  const page = `
    <html><head>
      <title>Fallback Title</title>
      <meta property="og:site_name" content="YouTube">
      <meta property="og:title" content="DHH &amp; Lex">
      <meta property="og:description" content="A description.">
      <meta property="og:image" content="https://i.ytimg.com/vi/X/maxresdefault.jpg">
      <link rel="icon" href="/favicon.ico">
    </head></html>`;

  it("prefers og:title over <title>", () => {
    expect(parseHtmlMeta(page, "https://www.youtube.com/watch?v=X").title).toBe(
      "DHH & Lex",
    );
  });

  it("falls back to <title> when og:title is absent", () => {
    const html = `<html><head><title>Only This</title></head></html>`;
    expect(parseHtmlMeta(html, "https://a.com").title).toBe("Only This");
  });

  it("resolves the favicon against the page url", () => {
    expect(parseHtmlMeta(page, "https://www.youtube.com/watch?v=X").favicon).toBe(
      "https://www.youtube.com/favicon.ico",
    );
  });

  it("defaults the favicon to /favicon.ico when no link tag exists", () => {
    expect(parseHtmlMeta("<html></html>", "https://a.com/x").favicon).toBe(
      "https://a.com/favicon.ico",
    );
  });

  it("returns nulls rather than throwing on an empty document", () => {
    const r = parseHtmlMeta("", "https://a.com");
    expect(r.title).toBeNull();
    expect(r.description).toBeNull();
    expect(r.image).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/unfurl.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/unfurl"`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/unfurl.ts

export type UnfurlResult = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  author: string | null;
  /** iframe src, present only for providers marked embeddable. */
  embedSrc: string | null;
  embeddable: boolean;
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

/**
 * Attribute order is not fixed in the wild, so both arrangements are tried.
 * The key is anchored with a closing quote so `og:image` cannot match
 * `og:image:width`.
 */
export function metaContent(html: string, key: string): string | null {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*?content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${k}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]).trim() || null;
  }
  return null;
}

export function absoluteUrl(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

const BLOCKED_V4 = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;
  return BLOCKED_V4.some((re) => re.test(h));
}

export function parseHtmlMeta(html: string, pageUrl: string): Partial<UnfurlResult> {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const iconHref =
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*?href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*?rel=["'][^"']*icon[^"']*["']/i)?.[1] ??
    "/favicon.ico";

  return {
    title:
      metaContent(html, "og:title") ??
      (titleTag ? decodeEntities(titleTag[1]).trim() || null : null),
    description:
      metaContent(html, "og:description") ?? metaContent(html, "description"),
    image: absoluteUrl(
      metaContent(html, "og:image") ?? metaContent(html, "twitter:image"),
      pageUrl,
    ),
    siteName: metaContent(html, "og:site_name"),
    favicon: absoluteUrl(iconHref, pageUrl),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/unfurl.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/unfurl.ts lib/unfurl.test.ts
git commit -m "feat: add unfurl metadata parsing and SSRF host guard"
```

---

### Task 2: Provider registry and the oEmbed/OG merge

Still pure. Adds provider matching and the precedence rules from the spec.

**Files:**
- Modify: `lib/unfurl.ts` (append)
- Modify: `lib/unfurl.test.ts` (append)

**Interfaces:**
- Consumes: `UnfurlResult`, `absoluteUrl` from Task 1
- Produces:
  - `type Provider = { name: string; match: RegExp; oembed: (url: string) => string; embeddable: boolean }`
  - `PROVIDERS: Provider[]`
  - `findProvider(url: string): Provider | null`
  - `type OEmbed = { title?: string; author_name?: string; thumbnail_url?: string; provider_name?: string; html?: string }`
  - `extractIframeSrc(html: string | undefined): string | null`
  - `mergeUnfurl(url: string, oembed: OEmbed | null, og: Partial<UnfurlResult>, provider: Provider | null): UnfurlResult`

- [ ] **Step 1: Write the failing tests**

```ts
// append to lib/unfurl.test.ts
import {
  extractIframeSrc,
  findProvider,
  mergeUnfurl,
  type OEmbed,
} from "@/lib/unfurl";

describe("findProvider", () => {
  it("matches both youtube url shapes", () => {
    expect(findProvider("https://youtu.be/NYFGCESmikA")?.name).toBe("YouTube");
    expect(findProvider("https://www.youtube.com/watch?v=NYFGCESmikA")?.name).toBe(
      "YouTube",
    );
  });

  it("returns null for an unknown host", () => {
    expect(findProvider("https://vnexpress.net/some-article")).toBeNull();
  });

  it("does not match a lookalike host", () => {
    expect(findProvider("https://notyoutube.com/watch?v=X")).toBeNull();
  });
});

describe("extractIframeSrc", () => {
  it("pulls src out of the oembed iframe", () => {
    const html =
      '<iframe width="200" height="113" src="https://www.youtube.com/embed/X?feature=oembed" frameborder="0"></iframe>';
    expect(extractIframeSrc(html)).toBe(
      "https://www.youtube.com/embed/X?feature=oembed",
    );
  });

  it("returns null when there is no iframe or no input", () => {
    expect(extractIframeSrc("<div>nope</div>")).toBeNull();
    expect(extractIframeSrc(undefined)).toBeNull();
  });
});

describe("mergeUnfurl", () => {
  // Field precedence is the table in the spec; these are the real values
  // observed from https://youtu.be/NYFGCESmikA on 2026-09-07.
  const oembed: OEmbed = {
    title: "DHH: Future of Programming",
    author_name: "Lex Fridman",
    thumbnail_url: "https://i.ytimg.com/vi/X/hqdefault.jpg",
    provider_name: "YouTube",
    html: '<iframe src="https://www.youtube.com/embed/X?feature=oembed"></iframe>',
  };
  const og = {
    title: "DHH: Future of Programming",
    description: "DHH is the creator of Ruby on Rails.",
    image: "https://i.ytimg.com/vi/X/maxresdefault.jpg",
    siteName: "YouTube",
    favicon: "https://www.youtube.com/favicon.ico",
  };
  const yt = findProvider("https://youtu.be/X");

  it("takes description from og, which oembed never provides", () => {
    expect(mergeUnfurl("https://youtu.be/X", oembed, og, yt).description).toBe(
      "DHH is the creator of Ruby on Rails.",
    );
  });

  it("prefers the og image because it is higher resolution", () => {
    expect(mergeUnfurl("https://youtu.be/X", oembed, og, yt).image).toBe(
      "https://i.ytimg.com/vi/X/maxresdefault.jpg",
    );
  });

  it("falls back to the oembed thumbnail when og has no image", () => {
    const r = mergeUnfurl("https://youtu.be/X", oembed, { ...og, image: null }, yt);
    expect(r.image).toBe("https://i.ytimg.com/vi/X/hqdefault.jpg");
  });

  it("takes author and embedSrc from oembed", () => {
    const r = mergeUnfurl("https://youtu.be/X", oembed, og, yt);
    expect(r.author).toBe("Lex Fridman");
    expect(r.embedSrc).toBe("https://www.youtube.com/embed/X?feature=oembed");
  });

  it("reports embeddable only when the provider allows it", () => {
    expect(mergeUnfurl("https://youtu.be/X", oembed, og, yt).embeddable).toBe(true);
    expect(mergeUnfurl("https://a.com/x", null, og, null).embeddable).toBe(false);
  });

  it("still returns a usable result when everything failed", () => {
    const r = mergeUnfurl("https://a.com/x", null, {}, null);
    expect(r).toMatchObject({
      url: "https://a.com/x",
      title: null,
      description: null,
      image: null,
      embedSrc: null,
      embeddable: false,
    });
    // Step 4 of the ladder: a bare-url card is still a card.
    expect(r.favicon).toBe("https://a.com/favicon.ico");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/unfurl.test.ts`
Expected: FAIL — `findProvider is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
// append to lib/unfurl.ts

export type Provider = {
  name: string;
  match: RegExp;
  oembed: (url: string) => string;
  embeddable: boolean;
};

/**
 * Only providers whose oEmbed endpoint has actually been exercised belong
 * here. Adding one on the strength of its documentation ships a silent
 * failure: the unfurl falls back to OG and the Embed option disappears with
 * no error anywhere.
 *
 * Verified 2026-09-07: YouTube.
 * Not yet verified, deliberately omitted: Vimeo, Spotify, SoundCloud,
 * CodePen, Figma. X/Twitter oEmbed now needs auth — leave it OG-only.
 */
export const PROVIDERS: Provider[] = [
  {
    name: "YouTube",
    match: /^https?:\/\/(www\.|m\.)?(youtube\.com\/watch|youtu\.be\/)/i,
    oembed: (url) =>
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    embeddable: true,
  },
];

export function findProvider(url: string): Provider | null {
  return PROVIDERS.find((p) => p.match.test(url)) ?? null;
}

export type OEmbed = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  provider_name?: string;
  html?: string;
};

export function extractIframeSrc(html: string | undefined): string | null {
  if (!html) return null;
  return html.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

export function mergeUnfurl(
  url: string,
  oembed: OEmbed | null,
  og: Partial<UnfurlResult>,
  provider: Provider | null,
): UnfurlResult {
  const embedSrc = provider?.embeddable ? extractIframeSrc(oembed?.html) : null;
  return {
    url,
    title: oembed?.title ?? og.title ?? null,
    // oEmbed has no description field at all; og is the only source.
    description: og.description ?? null,
    // og:image is typically the larger asset (maxres vs hq on YouTube).
    image: og.image ?? oembed?.thumbnail_url ?? null,
    favicon: og.favicon ?? absoluteUrl("/favicon.ico", url),
    siteName: og.siteName ?? oembed?.provider_name ?? null,
    author: oembed?.author_name ?? null,
    embedSrc,
    embeddable: Boolean(embedSrc),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/unfurl.test.ts`
Expected: PASS, 29 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/unfurl.ts lib/unfurl.test.ts
git commit -m "feat: add oembed provider registry and metadata merge"
```

---

### Task 3: The unfurl API route

**Files:**
- Create: `app/api/admin/unfurl/route.ts`

**Interfaces:**
- Consumes: `findProvider`, `parseHtmlMeta`, `mergeUnfurl`, `isBlockedHost` from Tasks 1–2
- Produces: `POST /api/admin/unfurl` with body `{ url: string }` → `UnfurlResult`, or `{ error: string }` with status 400/401/502

- [ ] **Step 1: Write the route**

No unit test: this is a thin composition of already-tested pure functions plus a real `fetch`. It is verified by hand in Step 2.

```ts
// app/api/admin/unfurl/route.ts
import {
  findProvider,
  isBlockedHost,
  mergeUnfurl,
  parseHtmlMeta,
  type OEmbed,
} from "@/lib/unfurl";
import { isAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_000_000;

function safeUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (isBlockedHost(u.hostname)) return null;
  return u;
}

/**
 * Reads at most MAX_BYTES so a large asset cannot be pulled into memory.
 * `expect` is a content-type substring the response must carry: a URL
 * pointing straight at a PDF or an image would otherwise have a megabyte of
 * binary run through the meta-tag regexes.
 */
async function fetchCapped(
  url: string,
  accept: string,
  expect: string,
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    // A redirect can land somewhere private even when the original was public.
    if (!safeUrl(res.url)) return null;
    const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (!ct.includes(expect)) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
      if (total >= MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    return new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const out = new Uint8Array(acc.length + c.length);
        out.set(acc);
        out.set(c, acc.length);
        return out;
      }, new Uint8Array()),
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const parsed = safeUrl(url);
  if (!parsed) {
    return NextResponse.json({ error: "url not allowed" }, { status: 400 });
  }

  const provider = findProvider(parsed.toString());

  const [oembedRaw, pageHtml] = await Promise.all([
    provider
      ? fetchCapped(provider.oembed(parsed.toString()), "application/json", "json")
      : Promise.resolve(null),
    fetchCapped(parsed.toString(), "text/html", "html"),
  ]);

  let oembed: OEmbed | null = null;
  if (oembedRaw) {
    try {
      oembed = JSON.parse(oembedRaw) as OEmbed;
    } catch {
      oembed = null;
    }
  }

  const og = pageHtml ? parseHtmlMeta(pageHtml, parsed.toString()) : {};

  // Every branch still returns a result: step 4 of the ladder is a card
  // carrying only the url and a guessed favicon, which is a valid outcome.
  return NextResponse.json(mergeUnfurl(parsed.toString(), oembed, og, provider));
}
```

- [ ] **Step 2: Verify by hand against a running dev server**

Run `npm run dev`, sign in as admin, then in the browser console on `/admin`:

```js
await (await fetch("/api/admin/unfurl", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url: "https://youtu.be/NYFGCESmikA" }),
})).json()
```

Expected: `title` set, `description` non-null, `image` ending `maxresdefault.jpg`, `author` `"Lex Fridman"`, `embeddable: true`, `embedSrc` a `youtube.com/embed/` URL.

Then repeat with:

- `{"url":"http://127.0.0.1:3000"}` → `400 url not allowed`
- a plain article URL → `embeddable: false`, `title` set
- a URL pointing straight at a PDF or an image → a bare result (`title: null`, `favicon` guessed) rather than garbage parsed out of binary, confirming the content-type check

- [ ] **Step 3: Run the full suite to confirm nothing regressed**

Run: `npm run test`
Expected: the 29 unfurl tests pass. Note `lib/resume-storage.test.ts` has 8 pre-existing failures unrelated to this work.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/unfurl/route.ts
git commit -m "feat: add admin unfurl endpoint"
```

---

### Task 4: The linkCard tiptap node

**Files:**
- Create: `components/editor/link-card-node.ts`
- Test: `tests/components/link-card-node.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `LinkCard` (a tiptap `Node`), with command `setLinkCard(attrs: LinkCardAttrs): boolean` and `type LinkCardAttrs`

- [ ] **Step 1: Confirm the `@tiptap/html` export names**

Run: `node --input-type=module -e "import * as m from '@tiptap/html'; console.log(Object.keys(m))"`
Expected: a list including `generateHTML` and `generateJSON`. Use whatever names it prints; if the module resolves differently, read `node_modules/@tiptap/html/package.json` for its `exports` map before continuing.

- [ ] **Step 2: Write the failing round-trip test**

This is the test that matters most. If `parseHTML` ever stops matching what `renderHTML` emits, every card in every saved post silently degrades to a plain link on next open.

```ts
// tests/components/link-card-node.test.ts
import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "@tiptap/html";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { LinkCard, type LinkCardAttrs } from "@/components/editor/link-card-node";

const extensions = [Document, Paragraph, Text, LinkCard];

const full: LinkCardAttrs = {
  url: "https://youtu.be/X",
  mode: "bookmark",
  title: "DHH: Future of Programming",
  description: "DHH is the creator of Ruby on Rails.",
  image: "https://i.ytimg.com/vi/X/maxresdefault.jpg",
  favicon: "https://www.youtube.com/favicon.ico",
  siteName: "YouTube",
  author: "Lex Fridman",
  embedSrc: null,
};

function roundTrip(attrs: LinkCardAttrs) {
  const doc = { type: "doc", content: [{ type: "linkCard", attrs }] };
  const html = generateHTML(doc, extensions);
  const back = generateJSON(html, extensions) as typeof doc;
  return { html, attrs: back.content[0].attrs };
}

describe("LinkCard round-trip", () => {
  it("preserves every attribute in bookmark mode", () => {
    expect(roundTrip(full).attrs).toEqual(full);
  });

  it("preserves every attribute in embed mode", () => {
    const embed: LinkCardAttrs = {
      ...full,
      mode: "embed",
      embedSrc: "https://www.youtube.com/embed/X?feature=oembed",
    };
    expect(roundTrip(embed).attrs).toEqual(embed);
  });

  it("survives a card whose optional fields are all null", () => {
    const bare: LinkCardAttrs = {
      url: "https://a.com/x",
      mode: "bookmark",
      title: null,
      description: null,
      image: null,
      favicon: null,
      siteName: null,
      author: null,
      embedSrc: null,
    };
    expect(roundTrip(bare).attrs).toEqual(bare);
  });

  it("emits the data attribute the parser keys on, not a class", () => {
    expect(roundTrip(full).html).toContain('data-link-card="bookmark"');
  });

  it("emits a lazy iframe in embed mode", () => {
    const html = roundTrip({
      ...full,
      mode: "embed",
      embedSrc: "https://www.youtube.com/embed/X",
    }).html;
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('src="https://www.youtube.com/embed/X"');
  });

  it("omits the thumbnail element entirely when there is no image", () => {
    const html = roundTrip({ ...full, image: null }).html;
    expect(html).not.toContain("link-card-thumb");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/components/link-card-node.test.ts`
Expected: FAIL — cannot resolve `@/components/editor/link-card-node`.

- [ ] **Step 4: Write the node**

```ts
// components/editor/link-card-node.ts
import { Node, mergeAttributes } from "@tiptap/core";

export type LinkCardAttrs = {
  url: string;
  mode: "bookmark" | "embed";
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  author: string | null;
  embedSrc: string | null;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    linkCard: { setLinkCard: (attrs: LinkCardAttrs) => ReturnType };
  }
}

/** Attribute name in the DOM for each node attribute. */
const DATA: Record<keyof LinkCardAttrs, string> = {
  url: "data-url",
  mode: "data-link-card",
  title: "data-title",
  description: "data-description",
  image: "data-image",
  favicon: "data-favicon",
  siteName: "data-site-name",
  author: "data-author",
  embedSrc: "data-embed-src",
};

export const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const attrs: Record<string, unknown> = {};
    for (const [key, dataName] of Object.entries(DATA)) {
      attrs[key] = {
        default: key === "mode" ? "bookmark" : null,
        parseHTML: (el: HTMLElement) => el.getAttribute(dataName),
        // Rendered explicitly in renderHTML; suppressed here so mergeAttributes
        // does not emit them twice.
        renderHTML: () => ({}),
      };
    }
    return attrs;
  },

  // Keyed on the attribute, never a class: classes are presentational and
  // will be renamed one day, and a missed selector silently degrades every
  // saved card back to a plain link.
  parseHTML() {
    return [{ tag: "[data-link-card]" }];
  },

  renderHTML({ node }) {
    const a = node.attrs as LinkCardAttrs;
    const data: Record<string, string> = {};
    for (const [key, dataName] of Object.entries(DATA)) {
      const v = a[key as keyof LinkCardAttrs];
      if (v != null) data[dataName] = String(v);
    }

    if (a.mode === "embed" && a.embedSrc) {
      return [
        "div",
        mergeAttributes(data, { class: "link-card-embed" }),
        [
          "iframe",
          {
            src: a.embedSrc,
            loading: "lazy",
            allowfullscreen: "true",
            referrerpolicy: "strict-origin-when-cross-origin",
            allow:
              "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            title: a.title ?? a.url,
          },
        ],
      ];
    }

    // Inline elements only: an <a> containing block elements is invalid and
    // browsers reparent it, which breaks parseHTML on the next load.
    const body: unknown[] = ["span", { class: "link-card-body" }];
    if (a.title) body.push(["span", { class: "link-card-title" }, a.title]);
    if (a.description)
      body.push(["span", { class: "link-card-desc" }, a.description]);

    const meta: unknown[] = ["span", { class: "link-card-meta" }];
    if (a.favicon)
      meta.push(["img", { class: "link-card-favicon", src: a.favicon, alt: "" }]);
    meta.push(["span", { class: "link-card-url" }, a.siteName ?? a.url]);
    body.push(meta);

    const children: unknown[] = [body];
    // Thumbnail last in the DOM, first visually — CSS reorders it so a screen
    // reader reaches the title before the decorative image.
    if (a.image)
      children.push(["img", { class: "link-card-thumb", src: a.image, alt: "" }]);

    return [
      "a",
      mergeAttributes(data, {
        class: "link-card",
        href: a.url,
        target: "_blank",
        rel: "noopener noreferrer",
      }),
      ...children,
    ] as never;
  },

  addCommands() {
    return {
      setLinkCard:
        (attrs: LinkCardAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/components/link-card-node.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add components/editor/link-card-node.ts tests/components/link-card-node.test.ts
git commit -m "feat: add the linkCard tiptap node"
```

---

### Task 5: Card styling

**Files:**
- Modify: `app/globals.css` (append, following the existing `.rehype-code-title` / `.admin-toolbar` block)

**Interfaces:**
- Consumes: the class names emitted by Task 4
- Produces: nothing importable

- [ ] **Step 1: Append the styles**

```css
/* Link cards. These class names exist only inside stored HTML in Supabase,
   which Tailwind's content globs never scan — so the styles must live here
   as real rules. @apply is fine: this file is processed by Tailwind. */

.link-card {
  @apply flex items-stretch gap-0 no-underline border rounded-lg overflow-hidden my-4 transition-colors;
  color: inherit;
}
.prose a.link-card,
.prose a.link-card:hover {
  @apply no-underline;
  color: inherit;
}
.link-card:hover {
  @apply bg-muted/40;
}
.link-card-body {
  @apply flex flex-col justify-center gap-1 p-3 min-w-0 flex-1;
}
.link-card-title {
  @apply text-sm font-medium truncate;
}
.link-card-desc {
  @apply text-xs text-muted-foreground;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.link-card-meta {
  @apply flex items-center gap-1.5 text-xs text-muted-foreground mt-1 min-w-0;
}
.link-card-favicon {
  @apply w-3.5 h-3.5 rounded-sm shrink-0 my-0;
}
.link-card-url {
  @apply truncate;
}
.link-card-thumb {
  @apply w-40 object-cover shrink-0 my-0 rounded-none;
  order: -1; /* markup puts it last; it reads first */
}
@media (max-width: 480px) {
  .link-card-thumb {
    @apply hidden;
  }
}

.link-card-embed {
  @apply relative w-full my-4 rounded-lg overflow-hidden border;
  aspect-ratio: 16 / 9;
}
.link-card-embed iframe {
  @apply absolute inset-0 w-full h-full;
  border: 0;
}
```

- [ ] **Step 2: Verify in both themes and inside prose**

Run `npm run dev`, open a post in the editor, and insert a card by hand for now via the browser console:

```js
// with the editor focused
window.__editor?.commands.setLinkCard({
  url: "https://youtu.be/NYFGCESmikA", mode: "bookmark",
  title: "DHH: Future of Programming", description: "DHH is the creator of Ruby on Rails.",
  image: "https://i.ytimg.com/vi/NYFGCESmikA/maxresdefault.jpg",
  favicon: "https://www.youtube.com/favicon.ico", siteName: "YouTube",
  author: "Lex Fridman", embedSrc: null,
})
```

If `window.__editor` is not exposed, insert the raw HTML into the post body field instead and reload. Check: no underline on the card, title truncates rather than wrapping, thumbnail sits on the **left**, and the whole card is legible in dark mode.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: style link cards and embeds"
```

---

### Task 6: Paste detection and the choice menu

**Files:**
- Modify: `components/simple-editor.tsx`

**Interfaces:**
- Consumes: `LinkCard`, `LinkCardAttrs` (Task 4); `POST /api/admin/unfurl` (Task 3)
- Produces: nothing importable

- [ ] **Step 1: Register the node and add paste detection**

In the `extensions` array (around `simple-editor.tsx:51`), add `LinkCard` after `Image.configure({...})`, and import it:

```ts
import { LinkCard, type LinkCardAttrs } from "@/components/editor/link-card-node";
```

Add state above `useEditor`:

```ts
// The url a card could be built from, and where its plain link sits.
const [pastedUrl, setPastedUrl] = useState<{ url: string; from: number; to: number } | null>(null);
const [unfurl, setUnfurl] = useState<LinkCardAttrs | null>(null);
const [unfurling, setUnfurling] = useState(false);
```

Extend `editorProps` (which already exists at `simple-editor.tsx:81`) with a paste handler:

```ts
editorProps: {
  attributes: { /* unchanged */ },
  handlePaste(view, event) {
    const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
    if (!/^https?:\/\/\S+$/.test(text)) return false;
    const { empty, $from } = view.state.selection;
    // Only offer on an empty paragraph, so pasting a url mid-sentence
    // still behaves like an ordinary paste.
    if (!empty || $from.parent.content.size > 0) return false;
    // Let the link land first: if the unfurl fails or the author walks
    // away, they still have a working link rather than nothing.
    return false;
  },
},
```

The handler returns `false` so tiptap's autolink inserts the link as usual; detection is what it contributes. Immediately after the paste, record the position in `onUpdate`:

```ts
onUpdate: ({ editor, transaction }) => {
  onChange(editor.getHTML());
  const pasted = transaction.getMeta("paste");
  if (!pasted) return;
  const { $from } = editor.state.selection;
  const text = $from.parent.textContent.trim();
  if (!/^https?:\/\/\S+$/.test(text)) return;
  const from = $from.start();
  setPastedUrl({ url: text, from, to: from + text.length });
},
```

- [ ] **Step 2: Fetch the unfurl when a url is detected**

```ts
useEffect(() => {
  if (!pastedUrl) {
    setUnfurl(null);
    return;
  }
  let cancelled = false;
  setUnfurling(true);
  fetch("/api/admin/unfurl", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: pastedUrl.url }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (cancelled) return;
      setUnfurl({
        url: d.url, mode: "bookmark", title: d.title, description: d.description,
        image: d.image, favicon: d.favicon, siteName: d.siteName,
        author: d.author, embedSrc: d.embedSrc,
      });
    })
    .catch(() => {})
    .finally(() => !cancelled && setUnfurling(false));
  return () => { cancelled = true; };
}, [pastedUrl]);
```

- [ ] **Step 3: Render the choice menu**

A second `BubbleMenu`, alongside the existing `LinkBubble` (`simple-editor.tsx:464`):

```tsx
<BubbleMenu
  editor={editor}
  shouldShow={() => Boolean(pastedUrl)}
  options={{ placement: "bottom" }}
>
  <div className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md">
    {unfurling ? (
      <span className="px-2 py-1 text-xs text-muted-foreground">Đang đọc link…</span>
    ) : (
      <>
        <Button size="sm" variant="ghost" onClick={() => setPastedUrl(null)}>
          Link thường
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!unfurl}
          onClick={() => insertCard("bookmark")}
        >
          Bookmark
        </Button>
        {unfurl?.embedSrc && (
          <Button size="sm" variant="ghost" onClick={() => insertCard("embed")}>
            Embed
          </Button>
        )}
      </>
    )}
  </div>
</BubbleMenu>
```

with

```ts
// One transaction, so a single undo returns to the plain link.
const insertCard = (mode: "bookmark" | "embed") => {
  if (!unfurl || !pastedUrl) return;
  editor
    .chain()
    .focus()
    .deleteRange({ from: pastedUrl.from, to: pastedUrl.to })
    .setLinkCard({ ...unfurl, mode })
    .run();
  setPastedUrl(null);
};
```

Note the Embed button appears only when `embedSrc` is set — which the API only returns for an allowlisted provider. Every other URL sees two choices.

- [ ] **Step 4: Verify by hand**

Run `npm run dev` and, in a post:
1. Paste `https://youtu.be/NYFGCESmikA` on an empty line → three buttons appear. Bookmark produces the card from the reference screenshot; one Ctrl-Z returns the plain link.
2. Paste the same URL and choose Embed → a 16:9 player.
3. Paste an ordinary article URL → only two buttons (no Embed).
4. Paste a URL in the middle of a sentence → no menu, ordinary paste.
5. Save, reload the post → the cards come back as cards, not links. **This is the regression that Task 4's round-trip test guards; confirm it by hand anyway.**

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: all new tests pass; `lib/resume-storage.test.ts` still shows its 8 pre-existing failures.

- [ ] **Step 6: Commit**

```bash
git add components/simple-editor.tsx
git commit -m "feat: offer bookmark or embed when a url is pasted"
```

---

## Notes for the executor

- `lib/resume-storage.test.ts` fails 8 tests before any of this work starts (`window.localStorage.clear is not a function`). It is unrelated. Do not try to fix it inside these tasks, and do not treat it as a regression.
- The paste-position tracking in Task 6 Step 1 is the least certain part of this plan. `transaction.getMeta("paste")` is how ProseMirror flags a paste, but if it proves unreliable in tiptap v3, the fallback is to compare the document before and after in `handlePaste` using `view.state.tr` and schedule the detection with `queueMicrotask`. Verify behaviour before building the menu on top of it.
- Adding a provider later is a two-line change to `PROVIDERS` in `lib/unfurl.ts` — but exercise its oEmbed endpoint with a real URL first. A provider added on documentation alone fails silently: the unfurl quietly falls back to OG and the Embed button never appears.
