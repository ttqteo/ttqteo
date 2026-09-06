import { IndexTable } from "@/components/portfolio/IndexTable";
import { buttonVariants } from "@/components/ui/button";
import { getSeriesByTag } from "@/lib/guides";
import { toIndexEntry } from "@/lib/index-entries";
import { getPublishedPosts } from "@/lib/posts";
import { countTags, postsWithTag } from "@/lib/tags";
import { ArrowLeftIcon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = true;
export const revalidate = 300;

type PageProps = { params: Promise<{ tag: string }> };

export async function generateStaticParams() {
  const counts = countTags(await getPublishedPosts());
  return counts.map(({ tag }) => ({ tag }));
}

export async function generateMetadata(props: PageProps) {
  const { tag } = await props.params;
  const decoded = decodeURIComponent(tag).toLowerCase();
  return {
    title: `#${decoded}`,
    description: `Các bài viết gắn tag ${decoded}.`,
  };
}

export default async function TagPage(props: PageProps) {
  const { tag } = await props.params;
  const decoded = decodeURIComponent(tag).toLowerCase();

  const posts = postsWithTag(await getPublishedPosts(), decoded);
  if (posts.length === 0) notFound();

  const series = getSeriesByTag(decoded);
  const entries = posts.map((post) => toIndexEntry(post));

  return (
    <div className="max-w-[720px] mx-auto px-4 py-12 sm:min-h-[78vh] min-h-[76vh]">
      <Link
        className={buttonVariants({ variant: "link", className: "!mx-0 !px-0 !-ml-1" })}
        href="/tags"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1.5" /> tất cả tag
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-4xl font-mono">#{decoded}</h1>
        <p className="mt-2 text-muted-foreground">
          {posts.length} bài viết
        </p>
      </header>

      {series && (
        <Link
          href={`/series/${series.tag}`}
          className="group flex gap-4 items-start py-4 px-3 -mx-3 mb-6 border border-border hover:border-accent transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                series
              </span>
              <span className="text-base">{series.title}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {series.description}
            </p>
          </div>
        </Link>
      )}

      <IndexTable entries={entries} />
    </div>
  );
}
