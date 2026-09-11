export type AdminFetchErrorKind = "auth" | "missing_table" | "network" | "server";

export class AdminFetchError extends Error {
  readonly kind: AdminFetchErrorKind;

  constructor(kind: AdminFetchErrorKind, message: string) {
    super(message);
    this.name = "AdminFetchError";
    this.kind = kind;
  }
}

/**
 * JSON fetch for the /api/admin routes behind the side panel. Every failure
 * comes out as an AdminFetchError whose `kind` the UI can act on: a lapsed
 * session and a table that was never created each get their own message
 * instead of one generic "something went wrong".
 */
export async function adminFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    });
  } catch {
    throw new AdminFetchError("network", "Không kết nối được server");
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminFetchError("auth", "Hết phiên đăng nhập");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (data?.code === "missing_table") {
      throw new AdminFetchError("missing_table", "Chưa chạy supabase/add_admin_side_panel.sql");
    }
    const message = typeof data?.error === "string" ? data.error : `Lỗi ${response.status}`;
    throw new AdminFetchError("server", message);
  }
  return data as T;
}
