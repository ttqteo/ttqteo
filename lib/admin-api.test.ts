import { afterEach, describe, expect, it, vi } from "vitest";

// Only the network call to Supabase Auth is faked; isAdminUser, requireAdmin
// and dbError run as they are.
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase-server")>()),
  getUser,
}));

import { dbError, requireAdmin } from "@/lib/admin-api";
import { isAdminUser } from "@/lib/supabase-server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getUser.mockReset();
});

describe("isAdminUser", () => {
  it("is nobody when ADMIN_EMAIL is unset or empty", () => {
    vi.stubEnv("ADMIN_EMAIL", undefined);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser({})).toBe(false);
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(isAdminUser({ email: "" })).toBe(false);
  });

  it("is only the user with the admin email", () => {
    vi.stubEnv("ADMIN_EMAIL", "me@example.com");
    expect(isAdminUser({ email: "me@example.com" })).toBe(true);
    expect(isAdminUser({ email: "you@example.com" })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("answers 401 signed out and 403 for anyone else, asking for the user once each time", async () => {
    vi.stubEnv("ADMIN_EMAIL", "me@example.com");
    getUser.mockResolvedValueOnce(null);
    expect((await requireAdmin())?.status).toBe(401);
    getUser.mockResolvedValueOnce({ email: "you@example.com" });
    expect((await requireAdmin())?.status).toBe(403);
    getUser.mockResolvedValueOnce({ email: "me@example.com" });
    expect(await requireAdmin()).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(3);
  });

  it("turns everyone away when ADMIN_EMAIL is unset", async () => {
    vi.stubEnv("ADMIN_EMAIL", undefined);
    getUser.mockResolvedValueOnce({});
    expect((await requireAdmin())?.status).toBe(403);
  });
});

describe("dbError", () => {
  it("reports a missing table by code, and falls back on an empty message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const missing = dbError({ code: "PGRST205" }, "test");
    expect(missing.status).toBe(500);
    expect(await missing.json()).toEqual({ error: "missing_table", code: "missing_table" });
    const empty = dbError({ code: "XX000", message: "" }, "test");
    expect(empty.status).toBe(500);
    expect(await empty.json()).toEqual({ error: "Database error" });
  });
});
