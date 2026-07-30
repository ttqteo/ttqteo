"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useAdminNav } from "./admin-nav";

/**
 * Still a real <a> so middle-click and "open in new tab" keep working; plain
 * left-clicks are routed through the shared transition instead, which is what
 * lets the table show its skeleton while the server renders.
 */
export function FilterLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  const { navigate, pendingHref } = useAdminNav();
  const pending = pendingHref === href;

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded px-1.5 py-1 text-sm transition-colors lg:px-2 ${
        active
          ? "bg-muted font-medium text-foreground"
          : count === 0
            ? "text-muted-foreground/40 hover:bg-muted/50"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      {pending ? (
        <Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground" />
      ) : (
        <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
          {count}
        </span>
      )}
    </Link>
  );
}
