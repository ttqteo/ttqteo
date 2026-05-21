"use client";

import { clearWriterResume } from "@/lib/resume-storage";
import { LogOutIcon } from "lucide-react";

export function LogoutForm() {
  return (
    <form
      action="/api/auth/logout"
      method="POST"
      onSubmit={() => {
        clearWriterResume();
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
      >
        <LogOutIcon className="w-3.5 h-3.5" />
        <span>logout</span>
      </button>
    </form>
  );
}
