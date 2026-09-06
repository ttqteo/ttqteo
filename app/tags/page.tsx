import { GUIDE_SERIES } from "@/lib/guides";
import { getPublishedPosts } from "@/lib/posts";
import { countTags } from "@/lib/tags";
import Link from "next/link";

export const revalidate = 300;

export const metadata = {
  title: "tags",
  description: "Duyệt bài viết theo chủ đề.",
};

export default async function TagsIndexPage() {
  const posts = await getPublishedPosts();
  const counts = countTags(posts);
  const seriesTags = new Set(GUIDE_SERIES.map((s) => s.tag));

  return (
    <div className="max-w-[720px] mx-auto px-4 py-12 sm:min-h-[78vh] min-h-[76vh]">
      <header className="mb-8">
        <h1 className="text-4xl">Tags</h1>
        <p className="mt-2 text-muted-foreground">
          Duyệt bài viết theo chủ đề.
        </p>
      </header>

      {counts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có bài nào được gắn tag.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {counts.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                className="group inline-flex items-baseline gap-1.5 font-mono text-sm px-2.5 py-1.5 border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                {tag}
                <span className="text-xs text-muted-foreground/60 tabular-nums group-hover:text-accent/70">
                  {count}
                </span>
                {seriesTags.has(tag) && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
                    series
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
