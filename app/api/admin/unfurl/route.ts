import {
  faviconHref,
  isBlockedAddress,
  isBlockedHostname,
  mergeUnfurl,
  parseOpenGraph,
  providerFor,
  titleTag,
  type OEmbed,
} from "@/lib/unfurl";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";

// dns.lookup and streaming response bodies both need the Node runtime.
export const runtime = "nodejs";

const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
/** Enough for any plausible <head>; stops a large file being pulled into memory. */
const MAX_BYTES = 1_000_000;

/**
 * A real browser UA. Plenty of sites answer a bare fetch with a login wall or
 * an empty body, and the card then degrades for no good reason.
 */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Rejects anything pointing inside the network the server sits in. Runs on
 * every hop, not just the first: a perfectly public URL is free to redirect to
 * 169.254.169.254.
 */
async function assertPublic(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsupported scheme");
  }
  if (isBlockedHostname(url.hostname)) throw new Error("blocked host");
  const { address } = await lookup(url.hostname);
  if (isBlockedAddress(address)) throw new Error("blocked address");
  return url;
}

async function fetchGuarded(rawUrl: string, accept: string): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = await assertPublic(current);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      await res.body?.cancel().catch(() => {});
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

/**
 * Reads at most MAX_BYTES, then drops the connection.
 *
 * `stopAfter` ends the read as soon as that marker has been seen. Everything
 * this route wants from a page lives in `<head>`, and sites like YouTube ship
 * hundreds of kilobytes of body after it — reading to the cap made the paste
 * menu wait seconds for bytes that were then thrown away.
 */
async function readCapped(res: Response, stopAfter?: string): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  // Only the tail of the previous chunk can carry a marker split across a
  // boundary, so this scans a small trailing window rather than the whole body.
  const probe = stopAfter ? new TextDecoder("utf-8") : null;
  let tail = "";
  try {
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
      if (probe && stopAfter) {
        tail = (tail + probe.decode(value, { stream: true })).slice(-8192);
        if (tail.toLowerCase().includes(stopAfter)) break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const buffer = new Uint8Array(Math.min(size, MAX_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= buffer.length) break;
    buffer.set(chunk.subarray(0, buffer.length - offset), offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8").decode(buffer);
}

async function fetchPage(
  url: string,
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetchGuarded(url, "text/html,application/xhtml+xml");
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    // Parsing a PDF or an image as markup wastes the byte budget for nothing.
    if (!/text\/html|application\/xhtml/i.test(type)) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    return { html: await readCapped(res, "</head>"), finalUrl: res.url || url };
  } catch {
    return null;
  }
}

async function fetchOEmbed(endpoint: string): Promise<OEmbed | null> {
  try {
    const res = await fetchGuarded(endpoint, "application/json");
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/json/i.test(type)) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    return JSON.parse(await readCapped(res)) as OEmbed;
  } catch {
    return null;
  }
}

// POST /api/admin/unfurl
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const raw = typeof body?.url === "string" ? body.url.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = await assertPublic(raw);
  } catch {
    return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
  }

  const url = target.toString();
  const provider = providerFor(url);

  // Neither source alone fills a card, so both are fetched, and either failing
  // just costs the fields it would have supplied.
  const [oembed, page] = await Promise.all([
    provider ? fetchOEmbed(provider.oembed(url)) : Promise.resolve(null),
    fetchPage(url),
  ]);

  return NextResponse.json(
    mergeUnfurl({
      url,
      oembed,
      og: page ? parseOpenGraph(page.html, page.finalUrl) : null,
      titleFallback: page ? titleTag(page.html) : null,
      favicon: page ? faviconHref(page.html, page.finalUrl) : null,
      provider,
    }),
  );
}
