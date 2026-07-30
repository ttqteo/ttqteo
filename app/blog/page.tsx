import { IndexEntry } from "@/components/portfolio/IndexTable";
import { getPublishedPosts } from "@/lib/posts";
import { Metadata } from "next";
import { BlogIndex } from "./components/blog-index";

export const metadata: Metadata = {
  title: "blog",
};

export const revalidate = 300;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  const filtered = posts.filter((p) => p.type === "post");

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const entries: IndexEntry[] = filtered.map((p) => {
    const created = new Date(p.createdAt);
    const updatedTs = new Date(p.updatedAt).getTime();
    const significantlyUpdated = updatedTs - created.getTime() >= 7 * DAY;
    return {
      year: formatDate(p.createdAt),
      groupYear: created.getFullYear(),
      title: p.title,
      description: p.description,
      href: `/blog/${p.slug}`,
      updatedLabel: significantlyUpdated ? formatDate(p.updatedAt) : undefined,
      updatedRecent: significantlyUpdated && now - updatedTs <= 30 * DAY,
      tags: (p.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
  });

  return (
    <div className="w-full mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-[1280px] px-4 py-12">
      <article className="flex-1 min-w-0 max-w-[920px] mx-auto lg:mx-0">
        <header className="mb-8">
          <h1 className="text-4xl">Blog</h1>
        </header>
        <BlogIndex entries={entries} />
      </article>

      <div className="hidden lg:block shrink-0 w-[220px]" aria-hidden />
    </div>
  );
}
