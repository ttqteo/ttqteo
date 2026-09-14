export type AdminFetchErrorKind = "auth" | "missing_table" | "network" | "server";

export class AdminFetchError extends Error {
  readonly kind: AdminFetchErrorKind;
  /** The route's own code for the failure, when it sent one, such as "clock_ahead". */
  readonly code: string | undefined;

  constructor(
    kind: AdminFetchErrorKind,
    message: string,
    options?: ErrorOptions & { code?: string },
  ) {
    super(message, options);
    this.name = "AdminFetchError";
    this.kind = kind;
    this.code = options?.code;
  }
}

// What a body that is not JSON reads as, told apart from a JSON null.
const UNREADABLE = Symbol("unreadable");

/**
 * JSON fetch for the /api/admin routes behind the side panel, never cached.
 * Every failure comes out as an AdminFetchError whose `kind` the UI can act
 * on: a lapsed session and a table that was never created each get their own
 * message instead of one generic "something went wrong", and a refusal the
 * route gave a code keeps it. A success whose body cannot be read is a
 * failure too, not a null; a 204 resolves to undefined.
 */
export async function adminFetch<T>(
  url: string,
  init: Omit<RequestInit, "cache"> = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", headers });
  } catch (error) {
    throw new AdminFetchError("network", "Không kết nối được server", { cause: error });
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminFetchError("auth", "Cần đăng nhập lại");
  }
  if (response.status === 204) return undefined as T;

  // A platform error page (an HTML 504, say) is not JSON. A failure still has
  // its status to go on; a success has nothing, so it fails too.
  const data: unknown = await response.json().catch(() => UNREADABLE);
  if (!response.ok) {
    const body = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    if (body.code === "missing_table") {
      throw new AdminFetchError("missing_table", "Chưa chạy supabase/add_admin_side_panel.sql");
    }
    const message = typeof body.error === "string" ? body.error : `Lỗi ${response.status}`;
    const code = typeof body.code === "string" ? body.code : undefined;
    throw new AdminFetchError("server", message, { code });
  }
  if (data === UNREADABLE) {
    throw new AdminFetchError("server", `Lỗi ${response.status}: không đọc được phản hồi`);
  }
  return data as T;
}
