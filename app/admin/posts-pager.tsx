"use client";

import { Button } from "@/components/ui/button";
import { pageList } from "@/lib/admin-posts";
import { cn } from "@/lib/utils";
import { usePostsQuery } from "./posts-query";

/**
 * Pages the already filtered, sorted list the table renders. Only shown when
 * there is more than one page — `posts-browser.tsx` guards that.
 */
export function PostsPager({
  page,
  pageCount,
  from,
  to,
  matching,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  matching: number;
}) {
  const { setQuery } = usePostsQuery();

  function goTo(n: number) {
    setQuery({ page: n });
    // A fresh page starts scrolled to the top, not wherever the previous
    // page's click happened to leave the viewport.
    window.scrollTo({ top: 0 });
  }

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
    >
      <span className="tabular-nums">
        {from}–{to} / {matching}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          Trước
        </Button>
        {pageList(page, pageCount).map((entry, i) =>
          entry === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1.5">
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === page ? "outline" : "ghost"}
              size="sm"
              aria-current={entry === page ? "page" : undefined}
              className={cn(
                "tabular-nums",
                entry === page && "font-medium text-foreground",
              )}
              onClick={() => goTo(entry)}
            >
              {entry}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => goTo(page + 1)}
        >
          Sau
        </Button>
      </div>
    </nav>
  );
}
