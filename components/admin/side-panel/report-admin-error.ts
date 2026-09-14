"use client";

import { AdminFetchError } from "@/lib/admin-fetch";
import { toast } from "sonner";

/** One toast for a failed side-panel request, with a way back in when the session lapsed. */
export function reportAdminError(error: unknown, action: string): void {
  if (error instanceof AdminFetchError && error.kind === "auth") {
    // One toast however many stores hit this, kept until dismissed: it is the
    // only word on why saves stop. Signing in again in another tab keeps the
    // unsaved text, since the cookies are shared. A reload here loses it, and
    // is a full reload rather than a client navigation because the server
    // decides whether the login screen is due, and only on a fresh request.
    toast.error("Cần đăng nhập lại", {
      id: "admin-session",
      duration: Infinity,
      description:
        "Đăng nhập lại bằng tài khoản admin ở tab khác rồi lưu lại để giữ chữ chưa lưu, hoặc tải lại trang.",
      action: { label: "Tải lại", onClick: () => window.location.reload() },
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
