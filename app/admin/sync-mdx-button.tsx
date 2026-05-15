"use client";

import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SyncMdxButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync-mdx", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Sync failed");
        return;
      }
      const n = data.conflictsSoftDeleted?.length ?? 0;
      if (n === 0) {
        toast.success("MDX và Supabase đã đồng bộ");
      } else {
        toast.success(`Đã soft-delete ${n} bài trùng slug trong Supabase`);
      }
      if (data.errors?.length) {
        for (const e of data.errors) toast.error(e);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={loading}>
      <RefreshCwIcon className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
      Sync MDX
    </Button>
  );
}
