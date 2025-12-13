"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Author } from "@/lib/markdown";
import { formatDate2 } from "@/lib/utils";
import Link from "next/link";
import Views from "./views";

type BlogCardProps = {
  date: string;
  title: string;
  description: string;
  slug: string;
  isPublished: boolean;
  authors?: Author[];
  tags?: string;
  cover?: string;
};

export function BlogCard({
  date,
  title,
  description,
  slug,
  authors,
  isPublished,
}: BlogCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="flex flex-col gap-2 items-start py-5 px-3 w-full max-w-3xl hover:text-destructive"
    >
      <h3 className="sm:text-4xl text-3xl font-bold -mt-1 pr-7">{title}</h3>
      <p className="text-base text-muted-foreground">{description}</p>
      <div className="flex items-center justify-between w-full mt-auto">
        {isPublished ? (
          <p className="text-base text-muted-foreground">
            <>published on {formatDate2(date)}</>
          </p>
        ) : (
          <Badge variant="destructive">draft</Badge>
        )}
        {authors && authors.length > 0 && <AvatarGroup users={authors} />}
      </div>
      <Views slug={slug} />
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
