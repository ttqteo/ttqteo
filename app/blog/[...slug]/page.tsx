import { Typography } from "@/components/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Author, getAllBlogStaticPaths, getBlogForSlug } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

// Enable static generation
export const dynamic = "force-static";
export const revalidate = false; // Never revalidate (pure static)

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const slug = params.slug.join("/");

  // Only check MDX (no database)
  const mdxRes = await getBlogForSlug(slug);
  if (mdxRes) {
    const { frontmatter } = mdxRes;
    return {
      title: `${!frontmatter.isPublished ? "[draft] " : ""}${frontmatter.title}`,
      description: frontmatter.description,
    };
  }

  return {};
}

export async function generateStaticParams() {
  const val = await getAllBlogStaticPaths();
  if (!val) return [];
  return val.map((it) => ({ slug: it.split("/") }));
}

/**
 * PURE STATIC VERSION
 *
 * Changes from original:
 * - Removed Supabase database fallback
 * - Only renders MDX blog posts
 * - No view counter (completely static)
 * - Static generation enabled (instant loading)
 *
 * Benefits:
 * - No database wake-up delays
 * - Perfect SEO (pre-rendered)
 * - Instant page loads
 * - Zero database costs
 * - 100% static, 100% fast!
 */
export default async function BlogPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug.join("/");

  // Only try MDX (no database fallback)
  const mdxRes = await getBlogForSlug(slug);

  if (!mdxRes) {
    notFound();
  }

  return (
    <div className="lg:w-[60%] sm:[95%] md:[75%] mx-auto sm:min-h-[78vh] min-h-[76vh]">
      <Link
        className={buttonVariants({
          variant: "link",
          className: "!mx-0 !px-0 mb-7 !-ml-1 ",
        })}
        href="/blog"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1.5" /> back to blog
      </Link>
      <div className="flex flex-col gap-3 pb-2 w-full mb-2">
        <h1 className="sm:text-4xl text-5xl font-semibold mb-2">
          {mdxRes.frontmatter.title}
        </h1>
        <Authors
          authors={mdxRes.frontmatter.authors || []}
          date={formatDate(mdxRes.frontmatter.date)}
        />
      </div>

      <div className="!w-full text-lg">
        {mdxRes.frontmatter.cover !== "" && (
          <div className="w-full mb-7">
            <Image
              src={mdxRes.frontmatter.cover}
              alt="cover"
              width={700}
              height={400}
              className="w-full h-[400px] rounded-md border object-contain bg-white"
            />
          </div>
        )}
        <Typography>{mdxRes.content}</Typography>
      </div>
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
