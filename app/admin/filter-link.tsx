"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import type { MouseEvent } from "react";

/**
 * `row` is the desktop sidebar: a full-width line with the count pushed to the
 * right edge, which reads as a list. `chip` is the same option on a phone,
 * where the sidebar becomes a sheet and a self-contained pill reads better
 * than a stretched row whose count floats away from its label.
 */
export type FilterVariant = "row" | "chip";

/**
 * Still a real <a> so middle-click and "open in new tab" keep working; a plain
 * left click is handled locally instead, because the list being filtered is
 * already in the browser and re-routing would fetch it again.
 */
export function FilterLink({
  href,
  label,
  count,
  active,
  variant = "row",
  onSelect,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  variant?: FilterVariant;
  onSelect: () => void;
}) {
  const empty = count === 0;
  const chip = variant === "chip";

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelect();
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center transition-colors",
        chip
          ? "shrink-0 gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs"
          : "justify-between gap-3 rounded px-1.5 py-1 text-sm lg:px-2",
        active &&
          (chip
            ? "border-foreground bg-foreground text-background"
            : "bg-muted font-medium text-foreground"),
        !active &&
          empty &&
          (chip
            ? "border-transparent bg-muted/30 text-muted-foreground/40"
            : "text-muted-foreground/40 hover:bg-muted/50"),
        !active &&
          !empty &&
          (chip
            ? "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"),
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          active ? "opacity-70" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </Link>
  );
}
