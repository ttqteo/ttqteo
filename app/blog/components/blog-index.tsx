"use client";

import { IndexEntry, IndexTable } from "@/components/portfolio/IndexTable";
import { countTagLists } from "@/lib/tags";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

function hrefFor(page: number, tag: string | null) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

function pageFromSearch(search: string) {
  const raw = new URLSearchParams(search).get("page");
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}

function tagFromSearch(search: string) {
  const raw = new URLSearchParams(search).get("tag");
  const tag = raw?.trim().toLowerCase();
  return tag ? tag : null;
}

/**
 * Pagination is client state rather than a `searchParams` read, so `/blog` can
 * be a static page whose first page of posts is real server-rendered HTML.
 * (`useSearchParams` would bail the whole subtree out to client rendering, and
 * reading `searchParams` on the server would force a render on every visit.)
 */
export function BlogIndex({ entries }: { entries: IndexEntry[] }) {
  // Starts unfiltered on page 1 to match the server-rendered markup; a deep
  // link to ?tag=…&page=N is picked up right after mount.
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tagCounts = useMemo(
    () => countTagLists(entries.map((e) => e.tags ?? [])),
    [entries],
  );

  const filtered = useMemo(
    () => (activeTag ? entries.filter((e) => e.tags?.includes(activeTag)) : entries),
    [entries, activeTag],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    const sync = () => {
      const { search } = window.location;
      setActiveTag(tagFromSearch(search));
      setCurrentPage(pageFromSearch(search));
    };

    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // A deep link can name a page past the end of a filtered list.
  const page = Math.min(currentPage, totalPages);

  const groups = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const byYear = new Map<number, IndexEntry[]>();
    for (const entry of filtered.slice(start, start + PAGE_SIZE)) {
      const year = Number(entry.groupYear ?? entry.year);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(entry);
    }
    return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered, page]);

  const goTo = (next: number) => {
    setCurrentPage(next);
    window.history.pushState(null, "", hrefFor(next, activeTag));
    window.scrollTo({ top: 0 });
  };

  // Selecting a tag shrinks the list, so page N rarely survives the change.
  const toggleTag = (tag: string) => {
    const next = activeTag === tag ? null : tag;
    setActiveTag(next);
    setCurrentPage(1);
    window.history.pushState(null, "", hrefFor(1, next));
  };

  return (
    <>
      {tagCounts.length > 0 && (
        <div
          role="group"
          aria-label="Lọc theo tag"
          className="mb-8 flex flex-wrap items-center gap-1.5"
        >
          {tagCounts.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={activeTag === tag}
              className={cn(
                "font-mono text-xs px-2 py-1 border transition-colors",
                activeTag === tag
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent",
              )}
            >
              {tag}{" "}
              <span className="text-muted-foreground/60 tabular-nums">{count}</span>
            </button>
          ))}
          <Link
            href="/tags"
            className="font-mono text-xs px-2 py-1 text-muted-foreground/70 hover:text-accent transition-colors"
          >
            tất cả tag →
          </Link>
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Chưa có bài nào gắn tag <span className="font-mono">{activeTag}</span>.
        </p>
      )}

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
          {page > 1 ? (
            <a
              href={hrefFor(page - 1, activeTag)}
              onClick={(e) => {
                e.preventDefault();
                goTo(page - 1);
              }}
              className="hover:text-accent transition-colors"
            >
              ← prev
            </a>
          ) : (
            <span className="opacity-40">← prev</span>
          )}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <a
              href={hrefFor(page + 1, activeTag)}
              onClick={(e) => {
                e.preventDefault();
                goTo(page + 1);
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
