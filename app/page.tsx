import { Hero } from "@/components/portfolio/Hero";
import { IndexTable } from "@/components/portfolio/IndexTable";
import { projectIndex } from "@/data/projects";
import { getAllPosts } from "@/lib/posts";
import Link from "next/link";

export const revalidate = 300;

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
  const posts = await getAllPosts({ view: "active" });
  const recentBlogs = posts
    .filter((p) => p.type === "post" && p.isPublished)
    .slice(0, 3)
    .map((p) => ({
      year: new Date(p.createdAt).getFullYear(),
      title: p.title,
      href: `/blog/${p.slug}`,
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
