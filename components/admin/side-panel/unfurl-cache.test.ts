import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UnfurlResult } from "@/lib/unfurl";

type Call = { url: string; init: RequestInit; resolve: (r: unknown) => void };
let calls: Call[] = [];

const res = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});
const result = (url: string, title: string): UnfurlResult => ({
  url,
  title,
  description: null,
  image: null,
  favicon: null,
  siteName: null,
  embedSrc: null,
  embeddable: false,
});
const flush = () => new Promise((r) => setTimeout(r, 0));

async function cache() {
  vi.resetModules();
  return import("./unfurl-cache");
}

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, init: RequestInit = {}) =>
        new Promise((resolve) => {
          calls.push({ url, init, resolve });
        }),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("unfurl cache", () => {
  it("asks the unfurl route once and keeps the answer", async () => {
    const { loadUnfurl, readUnfurl, subscribeUnfurl } = await cache();
    const listener = vi.fn();
    subscribeUnfurl(listener);

    expect(readUnfurl("https://a.com")).toBeUndefined();
    const done = loadUnfurl("https://a.com");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/admin/unfurl");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ url: "https://a.com" });

    calls[0].resolve(res(200, result("https://a.com", "A")));
    await done;
    expect(readUnfurl("https://a.com")?.title).toBe("A");
    expect(listener).toHaveBeenCalledTimes(1);

    await loadUnfurl("https://a.com");
    expect(calls).toHaveLength(1);
  });

  it("sends one request for a URL asked for twice while it is loading", async () => {
    const { loadUnfurl } = await cache();
    const first = loadUnfurl("https://a.com");
    const second = loadUnfurl("https://a.com");
    expect(calls).toHaveLength(1);
    calls[0].resolve(res(200, result("https://a.com", "A")));
    await Promise.all([first, second]);
  });

  it("remembers a failure as null so nothing asks again", async () => {
    const { loadUnfurl, readUnfurl } = await cache();
    const done = loadUnfurl("https://a.com");
    calls[0].resolve(res(400, { error: "URL không hợp lệ" }));
    await done;
    expect(readUnfurl("https://a.com")).toBeNull();
    await loadUnfurl("https://a.com");
    expect(calls).toHaveLength(1);
  });

  it("treats a network error as a failure too", async () => {
    const { loadUnfurl, readUnfurl } = await cache();
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    await loadUnfurl("https://a.com");
    await flush();
    expect(readUnfurl("https://a.com")).toBeNull();
  });

  it("drops the oldest answer once the cache is full", async () => {
    const { loadUnfurl, readUnfurl, UNFURL_CACHE_MAX } = await cache();
    for (let i = 0; i <= UNFURL_CACHE_MAX; i += 1) {
      const url = `https://a.com/${i}`;
      const done = loadUnfurl(url);
      calls[calls.length - 1].resolve(res(200, result(url, String(i))));
      await done;
    }
    expect(readUnfurl("https://a.com/0")).toBeUndefined();
    expect(readUnfurl(`https://a.com/${UNFURL_CACHE_MAX}`)?.title).toBe(String(UNFURL_CACHE_MAX));
  });
});
