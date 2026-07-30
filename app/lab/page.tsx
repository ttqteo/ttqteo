import { IndexTable } from "@/components/portfolio/IndexTable";
import type {
  IndexEntry,
  IndexEntryType,
} from "@/components/portfolio/IndexTable";
import { labStaticIndex } from "@/data/lab";
import { supabasePublic } from "@/lib/supabase-public";

// Published-only listing: ISR instead of force-dynamic, so navigating here is
// served from the cache rather than a fresh render on every visit.
export const revalidate = 300;
export const metadata = { title: "lab" };

export default async function LabPage() {
  const { data: rows } = await supabasePublic
    .from("blogs")
    .select("slug, title, type, updated_at, created_at")
    .in("type", ["note", "reading", "paper"])
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const dbEntries: IndexEntry[] = (rows ?? []).map((r) => ({
    year: new Date(r.updated_at ?? r.created_at).getFullYear(),
    title: r.title ?? "Untitled",
    href: `/lab/${r.slug}`,
    type: r.type as IndexEntryType,
  }));

  const merged = [...dbEntries, ...labStaticIndex].sort((a, b) =>
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
