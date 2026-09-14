// @vitest-environment node
// Node, không phải happy-dom: có `window` thì auth-js tưởng mình chạy trong
// trình duyệt và đi nhánh khác hẳn phía server.
import { AsyncLocalStorage } from "node:async_hooks";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as authCallback } from "@/app/auth/callback/route";
import { config, proxy } from "@/proxy";

// Server thật của Next tự đặt biến này. Thiếu nó, vài module của Next nạp muộn
// trong lúc test ném "AsyncLocalStorage accessed in runtime where it is not
// available".
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;

const SESSION = "sb-abcd-auth-token";
const VERIFIER = `${SESSION}-code-verifier`;

// Cookie mà route callback đọc và ghi qua `cookies()` của next/headers.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => void jar.set(name, value),
  }),
}));

const USER = {
  id: "u1",
  aud: "authenticated",
  role: "authenticated",
  email: "a@b.c",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

const encode = (value: unknown) =>
  `base64-${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
const decode = (cookie: string) =>
  JSON.parse(Buffer.from(cookie.slice("base64-".length), "base64url").toString());

/** Một phiên đã hết hạn mà refresh token cũng đã chết: cookie còn sót lại sau khi bị đăng xuất. */
const DEAD_SESSION = encode({
  access_token: "old.access.token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) - 3600,
  refresh_token: "dead",
  user: USER,
});

/**
 * Code verifier đúng dạng trình duyệt lưu: auth-js ghi nó thành JSON, rồi
 * @supabase/ssr mã hoá base64url. Một giá trị thô bị auth-js coi như không có.
 */
const VERIFIER_COOKIE = encode("verifier123");

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Máy chủ auth giả: refresh token nào cũng đã chết, còn đổi `code` chỉ thành
 * công khi gửi kèm đúng code verifier mà trình duyệt lưu lúc bấm đăng nhập.
 */
const authServer = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input).includes("grant_type=pkce")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    return body.code_verifier === "verifier123"
      ? json(200, {
          access_token: "new.access.token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "fresh",
          user: USER,
        })
      : json(400, {
          error_code: "bad_code_verifier",
          msg: "invalid request: both auth code and code verifier should be non-empty",
        });
  }
  return json(400, {
    error_code: "refresh_token_not_found",
    msg: "Invalid Refresh Token: Refresh Token Not Found",
  });
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubGlobal("fetch", authServer);
  vi.spyOn(console, "error").mockImplementation(() => {});
  jar.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  authServer.mockClear();
});

describe("proxy matcher", () => {
  it("chạy trên các trang /admin, để phiên được làm mới ở nơi ghi được cookie", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/admin" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/admin/edit/1" })).toBe(true);
  });

  it("không chạy trên /auth/callback", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/auth/callback?code=abc" })).toBe(
      false,
    );
  });

  it("lý do: chạy với một phiên đã chết thì proxy xoá luôn code verifier", async () => {
    // Đây là thứ đã khoá đăng nhập: getUser() thử refresh, thất bại, và
    // auth-js dọn phiên kèm code verifier của PKCE. Route callback chạy sau
    // proxy nên nhận một verifier rỗng, và đổi `code` thất bại.
    const request = new NextRequest("https://ttqteo.dev/auth/callback?code=abc", {
      headers: { cookie: `${SESSION}=${DEAD_SESSION}; ${VERIFIER}=${VERIFIER_COOKIE}` },
    });
    await proxy(request);
    expect(request.cookies.get(VERIFIER)?.value).toBe("");
  });
});

describe("/auth/callback", () => {
  const callback = (query: string) =>
    authCallback(new NextRequest(`https://ttqteo.dev/auth/callback${query}`));

  it("đổi được `code` lấy phiên dù trình duyệt còn giữ một phiên đã chết", async () => {
    jar.set(SESSION, DEAD_SESSION);
    jar.set(VERIFIER, VERIFIER_COOKIE);
    const response = await callback("?code=abc");
    expect(response.headers.get("location")).toBe("https://ttqteo.dev/admin");
    expect(decode(jar.get(SESSION)!).access_token).toBe("new.access.token");
  });

  it("đổi `code` thất bại: về trang đăng nhập ở /admin kèm báo lỗi", async () => {
    jar.set(VERIFIER, encode("wrong"));
    const response = await callback("?code=abc");
    expect(response.headers.get("location")).toBe(
      "https://ttqteo.dev/admin?login=failed",
    );
  });

  it("Google báo lỗi nên không có `code`: cũng về /admin kèm báo lỗi", async () => {
    const response = await callback("?error=access_denied&error_description=cancelled");
    expect(response.headers.get("location")).toBe(
      "https://ttqteo.dev/admin?login=failed",
    );
  });
});
