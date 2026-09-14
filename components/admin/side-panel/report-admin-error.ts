"use client";

import { AdminFetchError } from "@/lib/admin-fetch";
import { toast } from "sonner";

const SESSION_TOAST = "admin-session";
// Whether the sign-in toast is up, so a request that gets through can take it down.
let sessionToastUp = false;

/** One toast for a failed side-panel request, with a way back in when the session lapsed. */
export function reportAdminError(error: unknown, action: string): void {
  if (error instanceof AdminFetchError && error.kind === "auth") {
    // One toast however many stores hit this, kept until dismissed or until a
    // request gets through again (clearAdminSession): it is the only word on
    // why saves stop. Signing in again in another tab keeps the unsaved text,
    // since the cookies are shared. A reload here loses it, and is a full
    // reload rather than a client navigation because the server decides
    // whether the login screen is due, and only on a fresh request.
    sessionToastUp = true;
    toast.error("Cần đăng nhập lại", {
      id: SESSION_TOAST,
      duration: Infinity,
      description:
        "Đăng nhập lại bằng tài khoản admin ở tab khác rồi lưu lại để giữ chữ chưa lưu. Tải lại trang thì mất phần chưa lưu.",
      action: { label: "Tải lại", onClick: () => window.location.reload() },
      onDismiss: () => {
        sessionToastUp = false;
      },
    });
    return;
  }
  // Only our own messages are fit to show. Anything else is a bug: log it for
  // whoever fixes it, and say something plain.
  if (!(error instanceof AdminFetchError)) console.error(error);
  toast.error(`${action} không thành công`, {
    description: error instanceof AdminFetchError ? error.message : "Có lỗi không mong đợi.",
  });
}

/** Takes the sign-in toast down once a request gets through again. */
export function clearAdminSession(): void {
  if (!sessionToastUp) return;
  sessionToastUp = false;
  toast.dismiss(SESSION_TOAST);
}
