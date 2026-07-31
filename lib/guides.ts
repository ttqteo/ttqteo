import type { UnifiedPost } from "@/lib/posts";

export type GuideSection = { key: string; title: string };

export type GuideSeries = {
  /** Vừa là tag của bài viết, vừa là URL segment: /system-design */
  tag: string;
  title: string;
  description: string;
  /** Theo thứ tự hiển thị trên hub. */
  sections: GuideSection[];
};

export const GUIDE_SERIES: GuideSeries[] = [
  {
    tag: "system-design",
    title: "System Design",
    description:
      "Notes and worked examples on designing systems: core concepts, key technologies, and common interview problems.",
    sections: [
      { key: "concepts", title: "Core Concepts" },
      { key: "technologies", title: "Key Technologies" },
      { key: "problems", title: "Common Problems" },
    ],
  },
];

/** Chương gõ nhầm section (hoặc chưa điền) rơi vào đây thay vì biến mất khỏi hub. */
export const OTHER_SECTION: GuideSection = { key: "__other", title: "Other" };

export function getSeriesByTag(tag: string): GuideSeries | undefined {
  return GUIDE_SERIES.find((s) => s.tag === tag);
}

export function hasTag(post: Pick<UnifiedPost, "tags">, tag: string): boolean {
  return (post.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .includes(tag);
}

export type SectionGroup = { section: GuideSection; chapters: UnifiedPost[] };

export function groupChapters(
  posts: UnifiedPost[],
  series: GuideSeries,
): SectionGroup[] {
  const chapters = posts.filter(
    (p) => p.type === "guide" && p.isPublished && hasTag(p, series.tag),
  );

  const byOrder = (a: UnifiedPost, b: UnifiedPost) => {
    const ao = a.guideOrder ?? Infinity;
    const bo = b.guideOrder ?? Infinity;
    return ao !== bo ? ao - bo : a.title.localeCompare(b.title);
  };

  const known = new Set(series.sections.map((s) => s.key));
  const groups: SectionGroup[] = [];
  for (const section of series.sections) {
    const inSection = chapters
      .filter((c) => c.guideSection === section.key)
      .sort(byOrder);
    if (inSection.length) groups.push({ section, chapters: inSection });
  }
  const other = chapters
    .filter((c) => !c.guideSection || !known.has(c.guideSection))
    .sort(byOrder);
  if (other.length) groups.push({ section: OTHER_SECTION, chapters: other });
  return groups;
}

export function flattenChapters(groups: SectionGroup[]): UnifiedPost[] {
  return groups.flatMap((g) => g.chapters);
}

export function prevNext(
  flat: UnifiedPost[],
  slug: string,
): { prev?: UnifiedPost; next?: UnifiedPost } {
  const i = flat.findIndex((c) => c.slug === slug);
  if (i === -1) return {};
  return { prev: flat[i - 1], next: flat[i + 1] };
}
