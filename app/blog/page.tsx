import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Author, BlogMdxFrontmatter, getAllBlogs } from "@/lib/markdown";
import { formatDate2, stringToDate } from "@/lib/utils";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "blog",
};

export default async function BlogIndexPage() {
  const blogs = (await getAllBlogs()).sort(
    (a, b) => stringToDate(b.date).getTime() - stringToDate(a.date).getTime()
  );
  return (
    <div className="w-full mx-auto flex flex-col gap-1 sm:min-h-[78vh] min-h-[76vh] pt-2">
      <div className="mb-7 flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-center">my latest blogs</h1>
        {/* <p className="text-muted-foreground">follow to read more</p> */}
      </div>
      <div className="flex flex-col items-center mb-5">
        {blogs.map((blog) => (
          <BlogCard {...blog} slug={blog.slug} key={blog.slug} />
        ))}
      </div>
    </div>
  );
}

function BlogCard({
  date,
  title,
  description,
  slug,
  authors,
  isPublished,
  tags,
}: BlogMdxFrontmatter & { slug: string }) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="flex flex-col gap-1 items-start py-5 px-3 w-full sm:w-[400px] hover:text-destructive"
    >
      <h3 className="sm:text-3xl text-2xl font-bold -mt-1 pr-7">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex items-center justify-between w-full mt-auto">
        {isPublished ? (
          <p className="text-sm text-muted-foreground">
            <>published on {formatDate2(date)}</>
          </p>
        ) : (
          <Badge variant="destructive">draft</Badge>
        )}
        <AvatarGroup users={authors} />
      </div>
      {/* <TagsGroup tags={tags} /> TODO:*/}
    </Link>
  );
}

function TagsGroup({ tags }: { tags: string }) {
  return (
    <div className="flex gap-2 justify-start">
      {tags && tags.split(",").map((tag) => <Badge key={tag}>{tag}</Badge>)}
    </div>
  );
}

function AvatarGroup({ users, max = 4 }: { users: Author[]; max?: number }) {
  const displayUsers = users.slice(0, max);
  const remainingUsers = Math.max(users.length - max, 0);

  return (
    <div className="flex items-center">
      {displayUsers.map((user, index) => (
        <Avatar
          key={user.username}
          className={`inline-block border-2 w-9 h-9 border-background ${
            index !== 0 ? "-ml-3" : ""
          } `}
        >
          <AvatarImage src={user.avatar} alt={user.username} />
          <AvatarFallback>
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingUsers > 0 && (
        <Avatar className="-ml-3 inline-block border-2 border-background hover:translate-y-1 transition-transform">
          <AvatarFallback>+{remainingUsers}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
