import { Typography } from "@/components/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Author, getAllBlogStaticPaths, getBlogForSlug } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Views from "../components/views";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps) {
  const params = await props.params;

  const { slug } = params;

  const res = await getBlogForSlug(slug);
  if (!res) return {};
  const { frontmatter } = res;
  return {
    title: `${!frontmatter.isPublished ? "[draft] " : ""}${frontmatter.title}`,
    description: frontmatter.description,
  };
}

export async function generateStaticParams() {
  const val = await getAllBlogStaticPaths();
  if (!val) return [];
  return val.map((it) => ({ slug: it }));
}

export default async function BlogPage(props: PageProps) {
  const params = await props.params;

  const { slug } = params;

  const res = await getBlogForSlug(slug);
  if (!res) notFound();
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
          {res.frontmatter.title}
        </h1>
        <Authors
          authors={res.frontmatter.authors}
          date={formatDate(res.frontmatter.date)}
          slug={slug}
          isPublished={res.frontmatter.isPublished}
        />
      </div>

      <div className="!w-full text-lg">
        {res.frontmatter.cover !== "" && (
          <div className="w-full mb-7">
            <Image
              src={res.frontmatter.cover}
              alt="cover"
              width={700}
              height={400}
              className="w-full h-[400px] rounded-md border object-contain bg-white"
            />
          </div>
        )}
        <Typography>{res.content}</Typography>
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
