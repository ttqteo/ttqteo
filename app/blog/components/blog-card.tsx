import { Badge } from "@/components/ui/badge";
import { formatDate2 } from "@/lib/utils";
import Link from "next/link";

type BlogCardProps = {
  date: string;
  title: string;
  description: string;
  slug: string;
  isPublished: boolean;
  isFeatured?: boolean;
};

export function BlogCard({
  date,
  title,
  description,
  slug,
  isPublished,
  isFeatured = false,
}: BlogCardProps) {
  if (isFeatured) {
    return (
      <Link
        href={`/blog/${slug}`}
        className="group block py-8 mb-4 border-b-2 border-border cursor-pointer"
      >
        <h2 className="text-3xl font-bold leading-tight group-hover:underline underline-offset-4 decoration-2">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-lg text-muted-foreground">{description}</p>
        )}
        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          {isPublished ? (
            <time>{formatDate2(date)}</time>
          ) : (
            <Badge variant="destructive">draft</Badge>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${slug}`}
      className="group block py-5 border-b border-border/50 cursor-pointer"
    >
      <h3 className="text-lg font-semibold leading-tight group-hover:underline underline-offset-2 decoration-1">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {isPublished ? (
          <time>{formatDate2(date)}</time>
        ) : (
          <Badge variant="destructive">draft</Badge>
        )}
      </div>
    </Link>
  );
}
