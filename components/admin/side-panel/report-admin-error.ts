"use client";

import { AdminFetchError } from "@/lib/admin-fetch";
import { toast } from "sonner";

/** One toast for a failed side-panel request, with a way back in when the session lapsed. */
export function reportAdminError(error: unknown, action: string): void {
  if (error instanceof AdminFetchError && error.kind === "auth") {
    // A full reload, not a client navigation: the server decides whether the
    // login screen is due, and it only asks on a fresh request.
    toast.error("Hết phiên đăng nhập", {
      description: "Tải lại trang để đăng nhập lại.",
      action: { label: "Tải lại", onClick: () => window.location.reload() },
    });
    return;
  }
  toast.error(`${action} không thành công`, {
    description: error instanceof Error ? error.message : undefined,
  });
}
