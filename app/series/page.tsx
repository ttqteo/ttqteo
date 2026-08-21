import { GUIDE_SERIES, flattenChapters, groupChapters } from "@/lib/guides";
import { getPublishedSupabasePosts } from "@/lib/posts";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const revalidate = 300;
export const metadata = {
  title: "series",
  description: "Long-form series: nhiều chương, đọc theo thứ tự.",
};

export default async function SeriesIndexPage() {
  const posts = await getPublishedSupabasePosts();

  const series = GUIDE_SERIES.map((s) => ({
    ...s,
    chapterCount: flattenChapters(groupChapters(posts, s)).length,
  }));

  return (
    <div className="max-w-[720px] mx-auto px-4 py-12 sm:min-h-[78vh] min-h-[76vh]">
      <header className="mb-8">
        <h1 className="text-4xl">Series</h1>
        <p className="mt-2 text-muted-foreground">
          Viết dài, nhiều chương, đọc theo thứ tự.
        </p>
      </header>

      <ul>
        {series.map((s) => (
          <li key={s.tag}>
            <Link href={`/series/${s.tag}`}>
              <div className="group flex gap-4 items-start py-6 px-2 -mx-2 border-t border-border/60 border-l-2 border-l-transparent hover:border-l-accent hover:bg-accent/5 transition-colors">
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-base leading-snug">{s.title}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 mt-0.5" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                  <div className="mt-2 font-mono text-xs text-muted-foreground">
                    {s.chapterCount > 0
                      ? `${s.chapterCount} chương`
                      : "sắp có"}
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
