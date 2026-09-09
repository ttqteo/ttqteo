import { ReaderArticle, type ReaderToc } from "@/components/reader-article";
import { PostBody } from "@/components/post-body";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Author, getAllBlogStaticPaths, getBlogForSlug, getBlogTocs } from "@/lib/markdown";
import {
  getPublishedSupabasePosts,
  getPublishedSupabasePostBySlug,
} from "@/lib/posts";
import { injectHeadingIds, tocFromHtml } from "@/lib/toc";
import { formatDate } from "@/lib/utils";
import { GUIDE_SERIES, hasTag } from "@/lib/guides";
import { parseTags } from "@/lib/tags";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminEditButton } from "./admin-edit-button";

// MDX + published supabase paths are pre-rendered via generateStaticParams;
// anything newer renders on demand and is then cached for `revalidate` seconds.
export const dynamicParams = true;
export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const slug = params.slug.join("/");

  const mdxRes = await getBlogForSlug(slug);
  if (mdxRes) {
    const { frontmatter } = mdxRes;
    return {
      title: `${!frontmatter.isPublished ? "[draft] " : ""}${frontmatter.title}`,
      description: frontmatter.description,
    };
  }

  const dbPost = await getPublishedSupabasePostBySlug(slug);
  if (dbPost) {
    return {
      title: `${!dbPost.isPublished ? "[draft] " : ""}${dbPost.title}`,
      description: dbPost.description ?? undefined,
    };
  }

  return {};
}

export async function generateStaticParams() {
  const [mdxPaths, dbPosts] = await Promise.all([
    getAllBlogStaticPaths(),
    getPublishedSupabasePosts(),
  ]);

  const slugs = new Set(mdxPaths ?? []);
  for (const post of dbPosts) {
    if (post.type === "article") slugs.add(post.slug);
  }

  return [...slugs].map((it) => ({ slug: it.split("/") }));
}

export default async function BlogPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug.join("/");

  const mdxRes = await getBlogForSlug(slug);

  let title: string;
  let dateLabel: string;
  let updatedLabel: string | null = null;
  let authors: Author[] = [];
  let cover: string | null = null;
  let tags: string[] = [];
  let tocs: ReaderToc[] = [];
  let body: React.ReactNode;

  if (mdxRes) {
    title = mdxRes.frontmatter.title;
    dateLabel = formatDate(mdxRes.frontmatter.date);
    authors = mdxRes.frontmatter.authors || [];
    cover = mdxRes.frontmatter.cover || null;
    tags = parseTags(mdxRes.frontmatter.tags);
    tocs = await getBlogTocs(slug);
    body = <PostBody>{mdxRes.content}</PostBody>;

    // Declared in frontmatter, not inferred from git: see `BlogMdxFrontmatter`.
    const declaredUpdate = mdxRes.frontmatter.updated?.trim();
    if (declaredUpdate) updatedLabel = formatDate(declaredUpdate);
  } else {
    const dbPost = await getPublishedSupabasePostBySlug(slug);
    // Guide chapters have one canonical URL under their series hub.
    if (dbPost && dbPost.type === "guide") {
      const series = GUIDE_SERIES.find((s) =>
        hasTag({ tags: dbPost.tags ?? undefined }, s.tag),
      );
      if (series) redirect(`/series/${series.tag}/${slug}`);
      notFound();
    }
    if (!dbPost || !dbPost.isPublished) {
      notFound();
    }
    title = dbPost.title;
    dateLabel = formatDate(dbPost.createdAt);
    tags = parseTags(dbPost.tags);
    const DAY = 24 * 60 * 60 * 1000;
    if (
      new Date(dbPost.updatedAt).getTime() -
        new Date(dbPost.createdAt).getTime() >=
      DAY
    ) {
      updatedLabel = formatDate(dbPost.updatedAt);
    }
    const html = injectHeadingIds(dbPost.content);
    tocs = tocFromHtml(html);
    body = <PostBody html={html} />;
  }

  return (
    <ReaderArticle
      slug={slug}
      title={title}
      backHref="/blog"
      backLabel="back to blog"
      headerAction={<AdminEditButton slug={slug} />}
      tags={tags}
      tocs={tocs}
      meta={
        <>
          <Authors authors={authors} date={dateLabel} />
          {updatedLabel && (
            <div className="text-xs font-mono text-muted-foreground">
              Cập nhật ngày {updatedLabel}
            </div>
          )}
        </>
      }
    >
      {cover && (
        <div className="w-full mb-7">
          <Image
            src={cover}
            alt="cover"
            width={700}
            height={400}
            className="w-full h-[400px] rounded-md border object-contain bg-white"
          />
        </div>
      )}
      {body}
    </ReaderArticle>
  );
}

function Authors({
  authors,
  date,
}: {
  authors: Author[];
  date: string;
}) {
  // Handle case where authors might be undefined or empty
  if (!authors || authors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Xuất bản ngày {date}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8 flex-wrap justify-between">
      {authors.map((author) => {
        return (
          <Link
            href={author.handleUrl}
            className="flex items-center gap-2"
            key={author.username}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={author.avatar} />
              <AvatarFallback>
                {author.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="">
              <p className="flex items-center gap-1 text-sm font-medium">
                {author.username}
                <span className="font-code text-[13px] italic text-muted-foreground">
                  @{author.handle}
                </span>
              </p>
              <p className="text-muted-foreground text-sm">Xuất bản ngày {date}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
