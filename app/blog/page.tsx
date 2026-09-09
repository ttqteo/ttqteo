import { IndexEntry } from "@/components/portfolio/IndexTable";
import { toIndexEntry } from "@/lib/index-entries";
import { getPublishedPosts } from "@/lib/posts";
import { Metadata } from "next";
import { BlogIndex } from "./components/blog-index";

export const metadata: Metadata = {
  title: "blog",
};

export const revalidate = 300;

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  const filtered = posts.filter((p) => p.type === "article");

  const now = Date.now();
  const entries: IndexEntry[] = filtered.map((p) => toIndexEntry(p, now));

  return (
    <div className="w-full mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-[1280px] px-4 py-12">
      <article className="flex-1 min-w-0 max-w-[920px] mx-auto lg:mx-0">
        <header className="mb-8">
          <h1 className="text-4xl">Blog</h1>
          <p className="mt-2 text-muted-foreground">
            Ghi chép về lập trình, AI và chuyện đi học lại.
          </p>
        </header>
        <BlogIndex entries={entries} />
      </article>

      <div className="hidden lg:block shrink-0 w-[220px]" aria-hidden />
    </div>
  );
}
