import { Hero } from "@/components/portfolio/Hero";
import { IndexTable } from "@/components/portfolio/IndexTable";
import { projectIndex } from "@/data/projects";
import { getAllBlogs } from "@/lib/markdown";
import { stringToDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <Link
        href={href}
        className="font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
      >
        see all →
      </Link>
    </div>
  );
}

export default async function Home() {
  const blogs = await getAllBlogs();
  const recentBlogs = blogs
    .filter((b) => b.isPublished)
    .slice(0, 3)
    .map((b) => ({
      year: stringToDate(b.date).getFullYear(),
      title: b.title,
      href: `/blog/${b.slug}`,
    }));

  return (
    <div className="max-w-[720px] mx-auto px-4">
      <Hero />

      <section className="py-12">
        <SectionHeader title="Built" href="/projects" />
        <IndexTable entries={projectIndex.slice(0, 3)} />
      </section>

      <section className="py-12">
        <SectionHeader title="Written" href="/blog" />
        <IndexTable entries={recentBlogs} />
      </section>
    </div>
  );
}
