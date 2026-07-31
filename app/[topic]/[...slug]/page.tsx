import { ReaderArticle } from "@/components/reader-article";
import {
  GUIDE_SERIES,
  flattenChapters,
  getSeriesByTag,
  groupChapters,
  hasTag,
  prevNext,
} from "@/lib/guides";
import {
  extractTocFromHtml,
  getPublishedSupabasePosts,
  getPublishedSupabasePostBySlug,
  injectHeadingIds,
} from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

// Catch-all vi slug trong DB co the chua "/" (slug blog cu dang nam/thang/ngay/ten).
export const dynamicParams = true;
export const revalidate = 300;

type PageProps = { params: Promise<{ topic: string; slug: string[] }> };

export async function generateStaticParams() {
  const posts = await getPublishedSupabasePosts();
  const params: { topic: string; slug: string[] }[] = [];
  for (const series of GUIDE_SERIES) {
    for (const p of posts) {
      if (p.type === "guide" && hasTag(p, series.tag)) {
        params.push({ topic: series.tag, slug: p.slug.split("/") });
      }
    }
  }
  return params;
}

export async function generateMetadata(props: PageProps) {
  const { topic, slug } = await props.params;
  if (!getSeriesByTag(topic)) return {};
  const post = await getPublishedSupabasePostBySlug(slug.join("/"));
  if (!post || post.type !== "guide") return {};
  return { title: post.title, description: post.description ?? undefined };
}

export default async function GuideChapterPage(props: PageProps) {
  const params = await props.params;
  const { topic } = params;
  const slug = params.slug.join("/");

  const series = getSeriesByTag(topic);
  if (!series) notFound();

  const post = await getPublishedSupabasePostBySlug(slug);
  if (
    !post ||
    post.type !== "guide" ||
    !hasTag({ tags: post.tags ?? undefined }, series.tag)
  ) {
    notFound();
  }

  const all = await getPublishedSupabasePosts();
  const flat = flattenChapters(groupChapters(all, series));
  const { prev, next } = prevNext(flat, slug);

  const html = injectHeadingIds(post.content);
  const tocs = extractTocFromHtml(html);
  const tags = (post.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <ReaderArticle
      slug={slug}
      title={post.title}
      backHref={`/${series.tag}`}
      backLabel={series.title.toLowerCase()}
      tags={tags}
      tocs={tocs}
      meta={
        <div className="text-sm text-muted-foreground">
          Cập nhật ngày {formatDate(post.updatedAt)}
        </div>
      }
      footer={
        <nav className="flex justify-between gap-4 mt-14 pt-6 border-t text-sm">
          {prev ? (
            <Link
              href={`/${series.tag}/${prev.slug}`}
              className="hover:text-accent transition-colors"
            >
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/${series.tag}/${next.slug}`}
              className="text-right hover:text-accent transition-colors"
            >
              {next.title} →
            </Link>
          )}
        </nav>
      }
    >
      <div
        className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-m-20"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ReaderArticle>
  );
}
