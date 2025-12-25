"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

interface AdminTabsProps {
  isTrash: boolean;
}

export function AdminTabs({ isTrash }: AdminTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"all" | "trash" | null>(null);

  const handleTabClick = (tab: "all" | "trash", href: string) => {
    setActiveTab(tab);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="flex gap-4 mt-4 text-sm">
      <button
        onClick={() => handleTabClick("all", "/admin")}
        className={`flex items-center gap-1.5 ${
          !isTrash ? "font-bold underline" : "text-muted-foreground"
        }`}
        disabled={isPending}
      >
        {isPending && activeTab === "all" && (
          <Loader2 className="w-3 h-3 animate-spin" />
        )}
        All Posts
      </button>
      <button
        onClick={() => handleTabClick("trash", "/admin?view=trash")}
        className={`flex items-center gap-1.5 ${
          isTrash ? "font-bold underline" : "text-muted-foreground"
        }`}
        disabled={isPending}
      >
        {isPending && activeTab === "trash" && (
          <Loader2 className="w-3 h-3 animate-spin" />
        )}
        Trash
      </button>
    </div>
  );
}
