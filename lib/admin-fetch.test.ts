import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminFetch", () => {
  it("returns the JSON body", async () => {
    respondWith(200, { notes: [] });
    await expect(adminFetch("/api/admin/notes")).resolves.toEqual({ notes: [] });
  });

  it("sends JSON, uncached, when there is a body", async () => {
    const fetchMock = respondWith(200, {});
    await adminFetch("/api/admin/notes/1", { method: "PUT", body: "{}" });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  });

  it.each([401, 403])("reports %i as a lapsed session", async (status) => {
    respondWith(status, { error: "Unauthorized" });
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({ kind: "auth" });
  });

  it("reports a table that was never created", async () => {
    respondWith(500, { error: "missing_table", code: "missing_table" });
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({ kind: "missing_table" });
  });

  it("passes the server's message through", async () => {
    respondWith(500, { error: "boom" });
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({
      kind: "server",
      message: "boom",
    });
  });

  it("reports a request that never reached the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const error = await adminFetch("/api/admin/notes").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminFetchError);
    expect(error).toMatchObject({ kind: "network" });
  });
});
