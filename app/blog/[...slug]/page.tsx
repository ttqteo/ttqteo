import { Typography } from "@/components/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Author, getAllBlogStaticPaths, getBlogForSlug, getBlogTocs } from "@/lib/markdown";
import { extractTocFromHtml, getSupabasePostBySlug, injectHeadingIds } from "@/lib/posts";
import TocObserver from "@/components/toc-observer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/utils";
import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEditButton } from "./admin-edit-button";

// MDX paths are pre-rendered via generateStaticParams; supabase paths render on-demand.
export const dynamicParams = true;

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

  const dbPost = await getSupabasePostBySlug(slug);
  if (dbPost) {
    return {
      title: `${!dbPost.isPublished ? "[draft] " : ""}${dbPost.title}`,
      description: dbPost.description ?? undefined,
    };
  }

  return {};
}

export async function generateStaticParams() {
  const val = await getAllBlogStaticPaths();
  if (!val) return [];
  return val.map((it) => ({ slug: it.split("/") }));
}

export default async function BlogPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug.join("/");

  const mdxRes = await getBlogForSlug(slug);

  let title: string;
  let dateLabel: string;
  let authors: Author[] = [];
  let cover: string | null = null;
  let tocs: { level: number; text: string; href: string }[] = [];
  let body: React.ReactNode;

  if (mdxRes) {
    title = mdxRes.frontmatter.title;
    dateLabel = formatDate(mdxRes.frontmatter.date);
    authors = mdxRes.frontmatter.authors || [];
    cover = mdxRes.frontmatter.cover || null;
    tocs = await getBlogTocs(slug);
    body = <Typography>{mdxRes.content}</Typography>;
  } else {
    const dbPost = await getSupabasePostBySlug(slug);
    if (!dbPost || !dbPost.isPublished) {
      notFound();
    }
    title = dbPost.title;
    dateLabel = formatDate(dbPost.updatedAt);
    const html = injectHeadingIds(dbPost.content);
    tocs = extractTocFromHtml(html);
    body = (
      <div
        className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-m-20"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-6xl px-4">
      <article className="flex-1 min-w-0 max-w-[760px] mx-auto lg:mx-0">
        <div className="flex items-center justify-between mb-7">
          <Link
            className={buttonVariants({
              variant: "link",
              className: "!mx-0 !px-0 !-ml-1",
            })}
            href="/blog"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1.5" /> back to blog
          </Link>
          <AdminEditButton slug={slug} />
        </div>
        <div className="flex flex-col gap-3 pb-2 w-full mb-2">
          <h1 className="sm:text-3xl text-3xl font-semibold mb-2 leading-tight">
            {title}
          </h1>
          <Authors authors={authors} date={dateLabel} />
        </div>

        <div className="!w-full prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-h2:font-semibold prose-h3:font-semibold prose-h4:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-h3:mt-6 prose-h3:mb-2">
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
        </div>
      </article>

      {tocs.length > 0 && (
        <aside className="hidden lg:flex flex-col w-[220px] shrink-0 sticky top-16 h-[calc(100vh-5rem)] py-9">
          <h3 className="font-semibold text-sm mb-3">On this page</h3>
          <ScrollArea className="pb-2 pt-0.5 overflow-y-auto">
            <TocObserver data={tocs} />
          </ScrollArea>
        </aside>
      )}
    </div>
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
        {date}
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
              <p className="text-muted-foreground text-sm">{date}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
