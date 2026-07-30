import { GUIDE_SERIES, getSeriesByTag, groupChapters, hasTag } from "@/lib/guides";
import { getPublishedSupabasePosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

// Chi cac series khai bao trong config moi co trang hub; moi path khac 404
// ngay tu build nen dynamic segment nay khong nuot cac URL go nham.
export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_SERIES.map((s) => ({ topic: s.tag }));
}

type PageProps = { params: Promise<{ topic: string }> };

export async function generateMetadata(props: PageProps) {
  const { topic } = await props.params;
  const series = getSeriesByTag(topic);
  if (!series) return {};
  return { title: series.title, description: series.description };
}

export default async function GuideHubPage(props: PageProps) {
  const { topic } = await props.params;
  const series = getSeriesByTag(topic);
  if (!series) notFound();

  const posts = await getPublishedSupabasePosts();
  const groups = groupChapters(posts, series);
  const fieldNotes = posts
    .filter((p) => p.type === "post" && hasTag(p, series.tag))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div className="max-w-[720px] mx-auto px-4 py-12 sm:min-h-[78vh] min-h-[76vh]">
      <header className="mb-10">
        <h1 className="text-4xl">{series.title}</h1>
        <p className="mt-3 text-muted-foreground">{series.description}</p>
      </header>

      {groups.length === 0 && (
        <p className="text-muted-foreground">Chưa có chương nào. Sắp có.</p>
      )}

      {groups.map(({ section, chapters }, gi) => (
        <section key={section.key} className="mb-10">
          <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
          <ol className="space-y-2">
            {chapters.map((c, ci) => (
              <li key={c.id} className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground tabular-nums w-8 shrink-0">
                  {gi + 1}.{ci + 1}
                </span>
                <div>
                  <Link
                    href={`/${series.tag}/${c.slug}`}
                    className="hover:text-accent transition-colors"
                  >
                    {c.title}
                  </Link>
                  {c.description && (
                    <p className="text-sm text-muted-foreground">
                      {c.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {fieldNotes.length > 0 && (
        <section className="mt-14 pt-8 border-t">
          <h2 className="text-xl font-semibold mb-1">Field notes</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Bài viết kinh nghiệm liên quan, đọc kiểu blog.
          </p>
          <ul className="space-y-2">
            {fieldNotes.map((p) => (
              <li key={p.id} className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatDate(p.createdAt)}
                </span>
                <Link
                  href={`/blog/${p.slug}`}
                  className="hover:text-accent transition-colors"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
