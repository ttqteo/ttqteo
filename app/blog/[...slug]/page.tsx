import { Typography } from "@/components/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Author, getAllBlogStaticPaths, getBlogForSlug } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Views from "../components/views";
import { createSupabaseServerClient, isAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  // Join slug array for catch-all route (e.g., ["2024", "12", "13", "my-post"] => "2024/12/13/my-post")
  const slug = params.slug.join("/");

  // Check MDX first
  const mdxRes = await getBlogForSlug(slug);
  if (mdxRes) {
    const { frontmatter } = mdxRes;
    return {
      title: `${!frontmatter.isPublished ? "[draft] " : ""}${
        frontmatter.title
      }`,
      description: frontmatter.description,
    };
  }

  // Check database
  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("blogs")
    .select("title, description, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (post) {
    return {
      title: `${!post.is_published ? "[draft] " : ""}${post.title}`,
      description: post.description,
    };
  }

  return {};
}

export async function generateStaticParams() {
  const val = await getAllBlogStaticPaths();
  if (!val) return [];
  // Split each slug path into array segments for catch-all route
  return val.map((it) => ({ slug: it.split("/") }));
}

export default async function BlogPage(props: PageProps) {
  const params = await props.params;
  // Join slug array for catch-all route
  const slug = params.slug.join("/");

  // Try MDX first
  const mdxRes = await getBlogForSlug(slug);
  if (mdxRes) {
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
            authors={mdxRes.frontmatter.authors}
            date={formatDate(mdxRes.frontmatter.date)}
            slug={slug}
            isPublished={mdxRes.frontmatter.isPublished}
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

  // Try database
  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!post) notFound();

  // Check if user is admin
  const admin = await isAdmin();

  return (
    <div className="w-full mx-auto lg:w-[60%] sm:[95%] md:[75%] sm:min-h-[78vh] min-h-[76vh]">
      <div className="flex items-center sm:justify-between mb-7">
        <Link
          className={buttonVariants({
            variant: "link",
            className: "!mx-0 !px-0 !-ml-1",
          })}
          href="/blog"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1.5" /> back to blog
        </Link>
        {admin && (
          <Link
            href={`/admin/edit/${post.id}`}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
            })}
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-3 pb-2 w-full mb-2">
        <h1 className="sm:text-4xl text-5xl font-semibold mb-2">
          {post.title}
        </h1>
        <div className="flex items-center gap-8 flex-wrap justify-between">
          <p className="text-muted-foreground text-sm">
            {formatDate(post.created_at)}
          </p>
          <Views slug={slug} isDetail isPublished={post.is_published} />
        </div>
      </div>

      <div className="!w-full text-lg">
        {post.cover && (
          <div className="w-full mb-7">
            <Image
              src={post.cover}
              alt="cover"
              width={700}
              height={400}
              className="w-full h-[400px] rounded-md border object-contain bg-white"
            />
          </div>
        )}
        <div
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: (post.content || "").replace(/<p><\/p>/g, "<p><br></p>"),
          }}
        />
      </div>
    </div>
  );
}

function Authors({
  authors,
  date,
  slug,
  isPublished,
}: {
  authors: Author[];
  date: string;
  slug: string;
  isPublished: boolean;
}) {
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
      <Views slug={slug} isDetail isPublished={isPublished} />
    </div>
  );
}
