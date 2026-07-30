"use client";

import { IndexEntry, IndexTable } from "@/components/portfolio/IndexTable";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

function hrefForPage(page: number) {
  return page <= 1 ? "/blog" : `/blog?page=${page}`;
}

function pageFromSearch(search: string) {
  const raw = new URLSearchParams(search).get("page");
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}

/**
 * Pagination is client state rather than a `searchParams` read, so `/blog` can
 * be a static page whose first page of posts is real server-rendered HTML.
 * (`useSearchParams` would bail the whole subtree out to client rendering, and
 * reading `searchParams` on the server would force a render on every visit.)
 */
export function BlogIndex({ entries }: { entries: IndexEntry[] }) {
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  // Starts at 1 to match the server-rendered markup; a deep link to ?page=N is
  // picked up right after mount.
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const sync = () =>
      setCurrentPage(Math.min(pageFromSearch(window.location.search), totalPages));

    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [totalPages]);

  const groups = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const byYear = new Map<number, IndexEntry[]>();
    for (const entry of entries.slice(start, start + PAGE_SIZE)) {
      const year = Number(entry.groupYear ?? entry.year);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(entry);
    }
    return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
  }, [entries, currentPage]);

  const goTo = (page: number) => {
    setCurrentPage(page);
    window.history.pushState(null, "", hrefForPage(page));
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <div className="space-y-10">
        {groups.map(([year, items]) => (
          <section key={year}>
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-2">
              {year}
            </h2>
            <IndexTable entries={items} />
          </section>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-between font-mono text-xs text-muted-foreground">
          {currentPage > 1 ? (
            <a
              href={hrefForPage(currentPage - 1)}
              onClick={(e) => {
                e.preventDefault();
                goTo(currentPage - 1);
              }}
              className="hover:text-accent transition-colors"
            >
              ← prev
            </a>
          ) : (
            <span className="opacity-40">← prev</span>
          )}
          <span>
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <a
              href={hrefForPage(currentPage + 1)}
              onClick={(e) => {
                e.preventDefault();
                goTo(currentPage + 1);
              }}
              className="hover:text-accent transition-colors"
            >
              next →
            </a>
          ) : (
            <span className="opacity-40">next →</span>
          )}
        </nav>
      )}
    </>
  );
}
