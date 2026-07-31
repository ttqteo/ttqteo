import { IndexTable } from "@/components/portfolio/IndexTable";
import type {
  IndexEntry,
  IndexEntryType,
} from "@/components/portfolio/IndexTable";
import { labStaticIndex } from "@/data/lab";
import { getPublishedPosts } from "@/lib/posts";

// Published-only listing: ISR instead of force-dynamic, so navigating here is
// served from the cache rather than a fresh render on every visit.
export const revalidate = 300;
export const metadata = { title: "lab" };

const LAB_TYPES = ["reading", "paper"];

export default async function LabPage() {
  // Covers both sources: MDX posts with `type: reading|note|paper` in their
  // frontmatter and supabase rows with the same type. `post` belongs on /blog,
  // `guide` belongs to its series hub, so lab keeps an explicit whitelist.
  const posts = await getPublishedPosts();
  const labPosts = posts.filter((p) => LAB_TYPES.includes(p.type));

  const postEntries: IndexEntry[] = labPosts.map((p) => ({
    year: new Date(p.createdAt).getFullYear(),
    title: p.title,
    description: p.description,
    // MDX lab content is still rendered by the /blog route; only supabase-backed
    // entries have their own /lab page.
    href: p.source === "mdx" ? `/blog/${p.slug}` : `/lab/${p.slug}`,
    type: p.type as IndexEntryType,
  }));

  const merged = [...postEntries, ...labStaticIndex].sort((a, b) =>
    String(b.year).localeCompare(String(a.year)),
  );

  return (
    <div className="max-w-[720px] mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-4xl">Lab &amp; Research</h1>
        <p className="mt-2 text-muted-foreground">
          Experiments, notes, reading list, paper drafts. Things in motion.
        </p>
      </header>
      <IndexTable entries={merged} />
    </div>
  );
}
