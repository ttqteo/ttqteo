import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";

function respondWith(status: number, body: BodyInit | null) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(body, { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const respondJson = (status: number, value: unknown) => respondWith(status, JSON.stringify(value));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminFetch", () => {
  it("returns the JSON body", async () => {
    respondJson(200, { notes: [] });
    await expect(adminFetch("/api/admin/notes")).resolves.toEqual({ notes: [] });
  });

  it("sends JSON, uncached, when there is a body", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes/1", { method: "PUT", body: "{}" });
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({ method: "PUT", cache: "no-store" });
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
  });

  it("reads uncached, with no content type, when there is no body", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes");
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({ cache: "no-store" });
    expect(new Headers(init?.headers).has("content-type")).toBe(false);
  });

  it("keeps the caller's headers, whatever shape they come in", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes/1", {
      method: "PUT",
      body: "{}",
      headers: new Headers({ "X-Trace": "1" }),
    });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("x-trace")).toBe("1");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("keeps a content type the caller set", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes/1", {
      method: "PUT",
      body: "{}",
      headers: [["content-type", "text/plain"]],
    });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("content-type")).toBe("text/plain");
  });

  it.each([401, 403])("reports %i as a sign-in to renew", async (status) => {
    respondJson(status, { error: "Unauthorized" });
    const error = await adminFetch("/api/admin/notes").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminFetchError);
    expect(error).toMatchObject({ kind: "auth" });
  });

  it("reports a table that was never created", async () => {
    respondJson(500, { error: "missing_table", code: "missing_table" });
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({ kind: "missing_table" });
  });

  it("passes the server's message through", async () => {
    respondJson(500, { error: "boom" });
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({
      kind: "server",
      message: "boom",
    });
  });

  it("passes the server's code through, for refusals a store acts on", async () => {
    respondJson(400, { error: "Giờ trên máy đang nhanh hơn server", code: "clock_ahead" });
    await expect(
      adminFetch("/api/admin/notes/1", { method: "PUT", body: "{}" }),
    ).rejects.toMatchObject({ kind: "server", code: "clock_ahead" });
  });

  it("reports an error page that is not JSON by its status", async () => {
    respondWith(504, "<html>Gateway Timeout</html>");
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({
      kind: "server",
      message: "Lỗi 504",
    });
  });

  it("refuses a success whose body cannot be read", async () => {
    respondWith(200, "<html>not json</html>");
    const error = await adminFetch("/api/admin/notes").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminFetchError);
    expect(error).toMatchObject({ kind: "server" });
  });

  it("returns nothing for 204", async () => {
    respondWith(204, null);
    await expect(adminFetch("/api/admin/notes/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("resolves a JSON null as null", async () => {
    respondWith(200, "null");
    await expect(adminFetch("/api/admin/notes")).resolves.toBeNull();
  });

  it("reports a request that never reached the server", async () => {
    const cause = new TypeError("Failed to fetch");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw cause;
      }),
    );
    const error = await adminFetch("/api/admin/notes").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminFetchError);
    expect(error).toMatchObject({ kind: "network" });
    expect((error as Error).cause).toBe(cause);
  });
});
