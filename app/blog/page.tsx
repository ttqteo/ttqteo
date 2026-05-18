import { IndexEntry, IndexTable } from "@/components/portfolio/IndexTable";
import { getAllPosts } from "@/lib/posts";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "blog",
};

export const revalidate = 300;

const PAGE_SIZE = 20;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const posts = await getAllPosts({ view: "active" });
  const filtered = posts.filter((p) => p.type === "post" && p.isPublished);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const groups = new Map<number, IndexEntry[]>();
  for (const p of pageItems) {
    const created = new Date(p.createdAt);
    const year = created.getFullYear();
    const updatedTs = new Date(p.updatedAt).getTime();
    const createdTs = created.getTime();
    const significantlyUpdated = updatedTs - createdTs >= 7 * DAY;
    const tags = (p.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const entry: IndexEntry = {
      year: formatDate(p.createdAt),
      title: p.title,
      description: p.description,
      href: `/blog/${p.slug}`,
      draft: !p.isPublished,
      updatedLabel: significantlyUpdated ? formatDate(p.updatedAt) : undefined,
      updatedRecent: significantlyUpdated && now - updatedTs <= 30 * DAY,
      tags,
    };
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(entry);
  }

  const sortedYears = [...groups.keys()].sort((a, b) => b - a);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="w-full mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-[1280px] px-4 py-12">
      <article className="flex-1 min-w-0 max-w-[920px] mx-auto lg:mx-0">
        <header className="mb-8">
          <h1 className="text-4xl">Blog</h1>
        </header>
        <div className="space-y-10">
          {sortedYears.map((year) => (
            <section key={year}>
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-2">
                {year}
              </h2>
              <IndexTable entries={groups.get(year)!} />
            </section>
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-between font-mono text-xs text-muted-foreground">
            {hasPrev ? (
              <Link
                href={currentPage - 1 === 1 ? "/blog" : `/blog?page=${currentPage - 1}`}
                className="hover:text-accent transition-colors"
              >
                ← prev
              </Link>
            ) : (
              <span className="opacity-40">← prev</span>
            )}
            <span>
              {currentPage} / {totalPages}
            </span>
            {hasNext ? (
              <Link
                href={`/blog?page=${currentPage + 1}`}
                className="hover:text-accent transition-colors"
              >
                next →
              </Link>
            ) : (
              <span className="opacity-40">next →</span>
            )}
          </nav>
        )}
      </article>

      <div className="hidden lg:block shrink-0 w-[220px]" aria-hidden />
    </div>
  );
}
