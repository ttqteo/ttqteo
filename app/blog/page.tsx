import { IndexEntry, IndexTable } from "@/components/portfolio/IndexTable";
import { getAllPosts } from "@/lib/posts";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "blog",
};

export const dynamic = "force-dynamic";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts({ view: "active" });

  const filtered = posts.filter((p) => p.type === "post" && p.isPublished);

  const groups = new Map<number, IndexEntry[]>();
  for (const p of filtered) {
    const d = new Date(p.updatedAt);
    const year = d.getFullYear();
    const entry: IndexEntry = {
      year: formatDate(p.updatedAt),
      title: p.title,
      description: p.description,
      href: `/blog/${p.slug}`,
      draft: !p.isPublished,
    };
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(entry);
  }

  const sortedYears = [...groups.keys()].sort((a, b) => b - a);

  return (
    <div className="max-w-[720px] mx-auto px-4 py-12">
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
    </div>
  );
}
