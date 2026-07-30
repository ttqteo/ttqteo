# Guide Series Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Handbook-style guide series (Hello Interview kiểu) viết hoàn toàn qua admin: post type `guide` + 2 cột DB, hub `/[topic]` và trang chương `/[topic]/[...slug]`.

**Architecture:** Series = tag được khai báo trong config `lib/guides.ts`. Chương = row trong bảng `blogs` với `type='guide'`, tag của series, `guide_section` + `guide_order`. Hub và chapter là dynamic route đọc config + Supabase (cookie-free client, ISR). Design chi tiết: `docs/plans/2026-07-30-guide-series-design.md`.

**Tech Stack:** Next.js 16 App Router, Supabase (bảng `blogs`), vitest, TipTap admin editor sẵn có.

**Quy ước chạy test:** `pnpm test <file>` (vitest run). Type-check: `npx tsc --noEmit`.

---

### Task 1: Migration SQL

**Files:**
- Create: `supabase/add_blogs_guide_columns.sql`

**Step 1: Viết file migration**

```sql
-- Guide series: type 'guide' + section/order de xep chuong trong series.
-- Chi tiet: docs/plans/2026-07-30-guide-series-design.md

ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_type_check;
ALTER TABLE blogs ADD CONSTRAINT blogs_type_check
  CHECK (type IN ('post', 'note', 'reading', 'paper', 'guide'));

-- Chi co nghia khi type = 'guide'. numeric de chen giua (2.5) khong phai danh so lai.
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS guide_section text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS guide_order numeric;
```

Lưu ý: constraint tên `blogs_type_check` là tên Postgres tự sinh từ CHECK inline trong `add_blogs_type_column.sql`. Nếu DROP không ăn (constraint tên khác), chạy `SELECT conname FROM pg_constraint WHERE conrelid = 'blogs'::regclass AND contype = 'c';` để tìm tên thật.

**Step 2: Nhắc user chạy migration trên Supabase SQL editor.** Code app có graceful degradation nên thứ tự deploy/migrate không quan trọng, nhưng type `guide` sẽ không lưu được cho tới khi migration chạy.

**Step 3: Commit**

```bash
git add supabase/add_blogs_guide_columns.sql
git commit -m "feat: add guide type and section/order columns migration"
```

---

### Task 2: `lib/guides.ts` — config + pure logic (TDD)

**Files:**
- Create: `lib/guides.ts`
- Test: `lib/guides.test.ts`

Dùng @superpowers:test-driven-development. Style test theo `lib/admin-posts.test.ts` (helper `post()` factory).

**Step 1: Viết test fail trước**

```ts
import { describe, expect, it } from "vitest";
import {
  GUIDE_SERIES,
  getSeriesByTag,
  hasTag,
  groupChapters,
  flattenChapters,
  prevNext,
  type GuideSeries,
} from "@/lib/guides";
import type { UnifiedPost } from "@/lib/posts";

function post(overrides: Partial<UnifiedPost> & { id: string }): UnifiedPost {
  return {
    slug: `slug-${overrides.id}`,
    title: `Post ${overrides.id}`,
    type: "guide",
    isPublished: true,
    source: "supabase",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tags: "system-design",
    ...overrides,
  };
}

const series: GuideSeries = {
  tag: "system-design",
  title: "System Design",
  description: "test",
  sections: [
    { key: "concepts", title: "Core Concepts" },
    { key: "problems", title: "Common Problems" },
  ],
};

describe("getSeriesByTag", () => {
  it("finds a declared series and returns undefined otherwise", () => {
    expect(getSeriesByTag(GUIDE_SERIES[0].tag)).toBe(GUIDE_SERIES[0]);
    expect(getSeriesByTag("nope")).toBeUndefined();
  });
});

describe("hasTag", () => {
  it("matches comma-separated tags, trimmed, and ignores partial matches", () => {
    expect(hasTag(post({ id: "a", tags: "ai, system-design" }), "system-design")).toBe(true);
    expect(hasTag(post({ id: "a", tags: "system-design-2" }), "system-design")).toBe(false);
    expect(hasTag(post({ id: "a", tags: undefined }), "system-design")).toBe(false);
  });
});

describe("groupChapters", () => {
  it("keeps only published guides carrying the series tag", () => {
    const posts = [
      post({ id: "1", guideSection: "concepts", guideOrder: 1 }),
      post({ id: "2", type: "post" }),
      post({ id: "3", isPublished: false }),
      post({ id: "4", tags: "other" }),
    ];
    const grouped = groupChapters(posts, series);
    expect(grouped.flatMap((g) => g.chapters).map((c) => c.id)).toEqual(["1"]);
  });

  it("groups by section in config order and sorts by guideOrder", () => {
    const posts = [
      post({ id: "p1", guideSection: "problems", guideOrder: 1 }),
      post({ id: "c2", guideSection: "concepts", guideOrder: 2.5 }),
      post({ id: "c1", guideSection: "concepts", guideOrder: 1 }),
    ];
    const grouped = groupChapters(posts, series);
    expect(grouped.map((g) => g.section.key)).toEqual(["concepts", "problems"]);
    expect(grouped[0].chapters.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("puts unknown or missing sections into a trailing bucket instead of dropping them", () => {
    const posts = [
      post({ id: "known", guideSection: "concepts", guideOrder: 1 }),
      post({ id: "typo", guideSection: "concpets", guideOrder: 1 }),
      post({ id: "none", guideSection: undefined }),
    ];
    const grouped = groupChapters(posts, series);
    const last = grouped[grouped.length - 1];
    expect(last.section.key).toBe("__other");
    expect(last.chapters.map((c) => c.id)).toEqual(["typo", "none"]);
  });

  it("sorts chapters missing guideOrder after ordered ones, then by title", () => {
    const posts = [
      post({ id: "b", title: "B", guideSection: "concepts" }),
      post({ id: "a", title: "A", guideSection: "concepts" }),
      post({ id: "z", title: "Z", guideSection: "concepts", guideOrder: 1 }),
    ];
    const grouped = groupChapters(posts, series);
    expect(grouped[0].chapters.map((c) => c.id)).toEqual(["z", "a", "b"]);
  });

  it("omits sections that have no chapters", () => {
    const posts = [post({ id: "1", guideSection: "problems", guideOrder: 1 })];
    expect(groupChapters(posts, series).map((g) => g.section.key)).toEqual(["problems"]);
  });
});

describe("prevNext", () => {
  const posts = [
    post({ id: "1", slug: "s1", guideSection: "concepts", guideOrder: 1 }),
    post({ id: "2", slug: "s2", guideSection: "concepts", guideOrder: 2 }),
    post({ id: "3", slug: "s3", guideSection: "problems", guideOrder: 1 }),
  ];
  const flat = flattenChapters(groupChapters(posts, series));

  it("walks across section boundaries", () => {
    expect(prevNext(flat, "s2")).toEqual({ prev: flat[0], next: flat[2] });
  });

  it("returns undefined at the edges and for unknown slugs", () => {
    expect(prevNext(flat, "s1").prev).toBeUndefined();
    expect(prevNext(flat, "s3").next).toBeUndefined();
    expect(prevNext(flat, "nope")).toEqual({});
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm test lib/guides.test.ts`
Expected: FAIL — `Cannot find module '@/lib/guides'` (và `guideSection` chưa có trên `UnifiedPost` sẽ báo type lỗi ở editor, chưa sao vì vitest không type-check; Task 3 sẽ thêm field).

**Step 3: Implement `lib/guides.ts`**

```ts
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
```

**Step 4: Chạy lại test** — vẫn fail vì `guideOrder`/`guideSection` chưa tồn tại trên `UnifiedPost`? Không — vitest không type-check, test PASS được nếu logic đúng (field đọc từ object literal của test). Nếu PASS: ok, type sẽ chuẩn ở Task 3.

Run: `pnpm test lib/guides.test.ts`
Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add lib/guides.ts lib/guides.test.ts
git commit -m "feat: guide series config and grouping logic"
```

---

### Task 3: Plumbing `lib/posts.ts`

**Files:**
- Modify: `lib/posts.ts`

**Step 1: Thêm type + fields.** Các mảnh sửa:

1. Dòng 9: `export type PostType = "post" | "note" | "reading" | "paper" | "guide";`
2. Dòng 32: thêm `"guide"` vào `ALLOWED_TYPES`.
3. `UnifiedPost` (dòng 11-23): thêm

```ts
  guideSection?: string;
  guideOrder?: number;
```

4. `selectPostRows` (dòng 46-77): xin thêm cột guide, fallback theo pattern sẵn có. Thay dòng 47-57 bằng:

```ts
  let { data, error } = await runQuery(`${BASE_COLUMNS}, type, tags, guide_section, guide_order`);
  let hasType = true;
  let hasTags = true;
  let hasGuide = true;
  if (error && /guide_(section|order)/i.test(error.message)) {
    hasGuide = false;
    ({ data, error } = await runQuery(`${BASE_COLUMNS}, type, tags`));
  }
  if (error && /tags/i.test(error.message)) {
    hasTags = false;
    ({ data, error } = await runQuery(hasGuide ? `${BASE_COLUMNS}, type, guide_section, guide_order` : `${BASE_COLUMNS}, type`));
  }
  if (error && /'?type'? column|column .*type.* does not exist/i.test(error.message)) {
    hasType = false;
    ({ data, error } = await runQuery(hasTags ? `${BASE_COLUMNS}, tags` : BASE_COLUMNS));
  }
```

(Nhánh tags/type mất cột là DB rất cũ, không cần tổ hợp đủ 8 trường hợp với guide — DB thật đã có type + tags từ lâu.)

5. Trong map row (dòng 64-76) thêm:

```ts
    guideSection: hasGuide ? ((r.guide_section as string | null) ?? undefined) : undefined,
    guideOrder:
      hasGuide && r.guide_order != null ? Number(r.guide_order) : undefined,
```

6. `SupabasePostFull` (dòng 106-117): thêm `guideSection: string | null;` và `guideOrder: number | null;`. Trong `mapPostRow` (dòng 150-169) thêm:

```ts
    guideSection: (r.guide_section as string | null) ?? null,
    guideOrder: r.guide_order != null ? Number(r.guide_order) : null,
```

Chú ý: `guide_order` là `numeric` nên PostgREST trả **string** — luôn bọc `Number(...)`.

**Step 2: Type-check + test**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `pnpm test` — Expected: PASS toàn bộ (guides.test.ts giờ đã đúng type luôn).

**Step 3: Commit**

```bash
git add lib/posts.ts
git commit -m "feat: plumb guide type and section/order through post queries"
```

---

### Task 4: Admin view `guide`

**Files:**
- Modify: `lib/admin-posts.ts` (ViewKey dòng 11-21, VIEWS dòng 33-44)
- Modify: `app/admin/admin-sidebar.tsx` (dòng 12)
- Test: `lib/admin-posts.test.ts`

**Step 1: Viết test fail** — thêm vào `lib/admin-posts.test.ts`:

```ts
it("counts and filters the guide view", () => {
  const guides = [post({ id: "g1", type: "guide" }), post({ id: "p1" })];
  expect(countPosts(guides, []).guide).toBe(1);
  expect(filterAndSortPosts(guides, query({ view: "guide" })).map((p) => p.id)).toEqual(["g1"]);
});
```

Run: `pnpm test lib/admin-posts.test.ts`
Expected: FAIL — type error lúc chạy không có, nhưng `counts.guide` là `undefined` → fail assertion.

**Step 2: Implement**

- `lib/admin-posts.ts`: thêm `| "guide"` vào `ViewKey` (sau `"paper"`), thêm `"guide"` vào mảng `VIEWS` (sau `"paper"`).
- `app/admin/admin-sidebar.tsx` dòng 12: `views: ["post", "note", "reading", "paper", "guide"]`.

**Step 3: Chạy test**

Run: `pnpm test lib/admin-posts.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add lib/admin-posts.ts lib/admin-posts.test.ts app/admin/admin-sidebar.tsx
git commit -m "feat: guide view in admin sidebar"
```

---

### Task 5: API routes nhận `guide_section` / `guide_order`

**Files:**
- Modify: `app/api/posts/[id]/route.ts` (PUT, dòng 44-81)
- Modify: `app/api/posts/route.ts` (POST, dòng 61-108)

**Step 1: PUT.** Dòng 45 destructure thêm `guide_section, guide_order`. Sau `withTags` (dòng 63) thêm:

```ts
  const withGuide = {
    ...(guide_section !== undefined ? { guide_section } : {}),
    ...(guide_order !== undefined ? { guide_order } : {}),
  };
```

Spread `...withGuide` vào lời gọi `tryUpdate` đầu tiên (dòng 65-69). Thêm fallback trước nhánh tags (pattern retry sẵn có):

```ts
  if (error && /guide_(section|order)/i.test(error.message)) {
    ({ data, error } = await tryUpdate({ ...basePayload, ...withType, ...withTags }));
  }
```

**Step 2: POST.** Tương tự: destructure thêm ở dòng 62, thêm `...(guide_section !== undefined ? { guide_section } : {})` và guide_order vào payload đầu (dòng 89-93), thêm nhánh retry `/guide_(section|order)/i` bỏ 2 key đó trước các nhánh còn lại.

**Step 3: Verify**

Run: `npx tsc --noEmit` — Expected: no errors.

**Step 4: Commit**

```bash
git add app/api/posts
git commit -m "feat: persist guide section/order through posts API"
```

---

### Task 6: Admin editor — chọn Guide, Series, Section, Order, Slug

**Files:**
- Modify: `app/admin/edit/[id]/edit-post-client.tsx`
- Modify: `app/admin/edit/[id]/page.tsx` (truyền 2 field mới vào `initialData` — xem dòng 53 quanh chỗ `type`)

**Step 1: State + types.** Trong `edit-post-client.tsx`:

- Dòng 59: `const ALLOWED_TYPES = ["post", "note", "reading", "paper", "guide"] as const;`
- `PostData` (dòng 72-81): thêm `guide_section?: string | null; guide_order?: number | null;`
- Import: `import { GUIDE_SERIES, hasTag } from "@/lib/guides";`
- Sau state `type` (dòng 117) thêm:

```ts
  const [guideSection, setGuideSection] = useState<string>(
    initialData?.guide_section ?? "",
  );
  const [guideOrder, setGuideOrder] = useState<string>(
    initialData?.guide_order != null ? String(initialData.guide_order) : "",
  );
  // Series suy ra từ tag sẵn có; chọn series mới sẽ tự thêm tag khi save.
  const [seriesTag, setSeriesTag] = useState<string>(
    GUIDE_SERIES.find((s) => hasTag({ tags: initialData?.tags }, s.tag))?.tag ?? "",
  );
```

**Step 2: Auto-slug cho guide.** Effect tạo slug (quanh dòng 229-246, deps `[post.title, isNew]`): guide không lấy prefix ngày — URL handbook cần gọn. Đổi phần tính slug thành:

```ts
      const slug = type === "guide" ? name : `${year}/${month}/${day}/${name}-${suffix}`;
```

và thêm `type` vào dependency array. Slug Preview (dòng 578-596): khi `type === "guide"` render input sửa được thay vì text tĩnh:

```tsx
{type === "guide" ? (
  <div className="text-sm text-muted-foreground flex items-center gap-1">
    <span className="font-mono">/{seriesTag || "series"}/</span>
    <input
      type="text"
      value={post.slug}
      onChange={(e) => setPost({ ...post, slug: e.target.value })}
      className="font-mono bg-muted px-2 py-1 rounded outline-none min-w-[240px]"
    />
  </div>
) : (
  /* block preview cũ giữ nguyên */
)}
```

**Step 3: UI Series / Section / Order.** Trong khối "Type + Tags" (dòng 598-648), thêm sau Select type, chỉ render khi `type === "guide"`:

```tsx
{type === "guide" && (
  <>
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">Series</label>
      <Select value={seriesTag} onValueChange={(v) => { setSeriesTag(v); setGuideSection(""); }}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Chọn series" /></SelectTrigger>
        <SelectContent>
          {GUIDE_SERIES.map((s) => (
            <SelectItem key={s.tag} value={s.tag}>{s.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">Section</label>
      <Select value={guideSection} onValueChange={setGuideSection} disabled={!seriesTag}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Chọn section" /></SelectTrigger>
        <SelectContent>
          {(GUIDE_SERIES.find((s) => s.tag === seriesTag)?.sections ?? []).map((sec) => (
            <SelectItem key={sec.key} value={sec.key}>{sec.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">Order</label>
      <input
        type="number"
        step="0.5"
        value={guideOrder}
        onChange={(e) => setGuideOrder(e.target.value)}
        placeholder="1"
        className="h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  </>
)}
```

Thêm `<SelectItem value="guide">Guide</SelectItem>` vào Select type (sau Paper, dòng 613).

**Step 4: Save payload.** Trong `handleSave` (dòng 282-286), body thành:

```ts
        body: JSON.stringify({
          ...post,
          is_published: publish,
          type,
          tags:
            type === "guide" && seriesTag && !hasTag({ tags: post.tags }, seriesTag)
              ? [post.tags, seriesTag].filter(Boolean).join(", ")
              : post.tags,
          guide_section: type === "guide" && guideSection ? guideSection : null,
          guide_order:
            type === "guide" && guideOrder.trim() !== "" ? Number(guideOrder) : null,
        }),
```

**Step 5: Server truyền initial data.** Trong `app/admin/edit/[id]/page.tsx`, chỗ build `initialData` (quanh dòng 53) thêm:

```ts
        guide_section: post.guideSection ?? null,
        guide_order: post.guideOrder ?? null,
```

(`post` ở đây là kết quả `getSupabasePostBySlug`/fetch tương ứng — đọc file để khớp tên biến thật khi sửa.)

**Step 6: Verify**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `pnpm dev` → mở `/admin`, tạo post mới, đổi type sang Guide → thấy Series/Section/Order + slug sửa được. Save → check row trong admin (view guide đếm 1). Cần migration Task 1 đã chạy.

**Step 7: Commit**

```bash
git add app/admin/edit
git commit -m "feat: guide fields in admin editor"
```

---

### Task 7: Tách reader shell dùng chung

**Files:**
- Create: `components/reader-article.tsx`
- Modify: `app/blog/[...slug]/page.tsx`

Trang blog (dòng 152-225) và trang chương sắp tới cần cùng một shell: back link, title, tags, meta line, body, TOC sidebar, scroll/progress. Tách phần JSX return của `BlogPage` thành component nhận slots — **không đổi hành vi trang blog**.

**Step 1: Tạo `components/reader-article.tsx`** (server component):

```tsx
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  ReaderContent,
  ReaderControlsAnchor,
  ReaderSidebar,
  ScrollToTopButton,
} from "@/components/reader-controls";
import { FadedScroll } from "@/components/faded-scroll";
import { ReaderProgressTracker } from "@/components/resume/reader-progress-tracker";
import { ScrollRestorer } from "@/components/resume/scroll-restorer";
import TocObserver from "@/components/toc-observer";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export type ReaderToc = { level: number; text: string; href: string };

export function ReaderArticle({
  slug,
  title,
  backHref,
  backLabel,
  headerAction,
  tags = [],
  meta,
  tocs,
  footer,
  children,
}: {
  slug: string;
  title: string;
  backHref: string;
  backLabel: string;
  headerAction?: React.ReactNode;
  tags?: string[];
  meta?: React.ReactNode;
  tocs: ReaderToc[];
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-[1280px] px-4">
      <ReaderControlsAnchor hasToc={tocs.length > 0} />
      <article className="flex-1 min-w-0 max-w-[920px] mx-auto lg:mx-0">
        <div className="flex items-center justify-between mb-7">
          <Link
            className={buttonVariants({ variant: "link", className: "!mx-0 !px-0 !-ml-1" })}
            href={backHref}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1.5" /> {backLabel}
          </Link>
          {headerAction}
        </div>
        <div className="flex flex-col gap-3 pb-2 w-full mb-2">
          <h1 className="sm:text-3xl text-3xl font-semibold mb-2 leading-tight">{title}</h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-1 mb-1">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="font-mono text-xs">{t}</Badge>
              ))}
            </div>
          )}
          {meta}
        </div>
        <div className="!w-full prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-h2:font-semibold prose-h3:font-semibold prose-h4:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-h3:mt-6 prose-h3:mb-2">
          <ReaderContent>{children}</ReaderContent>
        </div>
        {footer}
      </article>
      <ReaderSidebar hasToc={tocs.length > 0}>
        <FadedScroll className="flex-1 min-h-0 pb-2 pt-0.5 pr-2">
          <TocObserver data={tocs} />
        </FadedScroll>
      </ReaderSidebar>
      <ScrollToTopButton />
      <ReaderProgressTracker slug={slug} title={title} />
      <ScrollRestorer slug={slug} />
    </div>
  );
}
```

**Step 2: Refactor `app/blog/[...slug]/page.tsx`** dùng `ReaderArticle`:

- `headerAction={<AdminEditButton slug={slug} />}`, `backHref="/blog"`, `backLabel="back to blog"`.
- `meta` = khối `<Authors .../>` + dòng updated/history hiện tại (giữ nguyên JSX, chỉ chuyển vào prop).
- `children` = khối cover (nếu có) + `body` — cover chuyển vào trong children, trước body.
- Xóa các import không còn dùng trực tiếp trong page.

**Step 3: Verify không đổi hành vi**

Run: `npx tsc --noEmit` — no errors.
Run: `pnpm dev` → mở 1 bài blog supabase và 1 bài mdx: TOC, tags, updated line, admin edit button vẫn như cũ.

**Step 4: Commit**

```bash
git add components/reader-article.tsx app/blog
git commit -m "refactor: extract shared reader article shell"
```

---

### Task 8: Hub `/[topic]`

**Files:**
- Create: `app/[topic]/page.tsx`

**Step 1: Implement**

```tsx
import { GUIDE_SERIES, getSeriesByTag, groupChapters, hasTag } from "@/lib/guides";
import { getPublishedSupabasePosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
                  <Link href={`/${series.tag}/${c.slug}`} className="hover:text-accent transition-colors">
                    {c.title}
                  </Link>
                  {c.description && (
                    <p className="text-sm text-muted-foreground">{c.description}</p>
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
                <Link href={`/blog/${p.slug}`} className="hover:text-accent transition-colors">
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
```

Chú ý: check `formatDate` trong `lib/utils` nhận ISO string (trang blog đã dùng y vậy, dòng 129).

**Step 2: Verify**

Run: `pnpm dev` → `/system-design` ra hub (rỗng cũng được), `/khong-ton-tai` ra 404.

**Step 3: Commit**

```bash
git add "app/[topic]/page.tsx"
git commit -m "feat: guide series hub page"
```

---

### Task 9: Trang chương `/[topic]/[...slug]`

**Files:**
- Create: `app/[topic]/[...slug]/page.tsx`

Catch-all vì slug trong DB có thể chứa `/` (blog slug auto-gen dạng `2026/07/30/ten-abcd`; guide slug mới thì phẳng nhưng phải chịu được cả hai).

**Step 1: Implement**

```tsx
import { ReaderArticle } from "@/components/reader-article";
import {
  getSeriesByTag,
  groupChapters,
  flattenChapters,
  hasTag,
  prevNext,
  GUIDE_SERIES,
} from "@/lib/guides";
import {
  extractTocFromHtml,
  getPublishedSupabasePosts,
  getPublishedSupabasePostBySlug,
  injectHeadingIds,
} from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = true;
export const revalidate = 300;

type PageProps = { params: Promise<{ topic: string; slug: string[] }> };

export async function generateStaticParams() {
  const posts = await getPublishedSupabasePosts();
  const params: { topic: string; slug: string[] }[] = [];
  for (const series of GUIDE_SERIES) {
    for (const p of posts) {
      if (p.type === "guide" && hasTag(p, series.tag)) {
        params.push({ topic: series.tag, slug: p.slug.split("/") });
      }
    }
  }
  return params;
}

export async function generateMetadata(props: PageProps) {
  const { topic, slug } = await props.params;
  if (!getSeriesByTag(topic)) return {};
  const post = await getPublishedSupabasePostBySlug(slug.join("/"));
  if (!post || post.type !== "guide") return {};
  return { title: post.title, description: post.description ?? undefined };
}

export default async function GuideChapterPage(props: PageProps) {
  const params = await props.params;
  const { topic } = params;
  const slug = params.slug.join("/");

  const series = getSeriesByTag(topic);
  if (!series) notFound();

  const post = await getPublishedSupabasePostBySlug(slug);
  if (!post || post.type !== "guide" || !hasTag({ tags: post.tags }, series.tag)) {
    notFound();
  }

  const all = await getPublishedSupabasePosts();
  const flat = flattenChapters(groupChapters(all, series));
  const { prev, next } = prevNext(flat, slug);

  const html = injectHeadingIds(post.content);
  const tocs = extractTocFromHtml(html);
  const tags = (post.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <ReaderArticle
      slug={slug}
      title={post.title}
      backHref={`/${series.tag}`}
      backLabel={series.title.toLowerCase()}
      tags={tags}
      meta={
        <div className="text-sm text-muted-foreground">
          Cập nhật ngày {formatDate(post.updatedAt)}
        </div>
      }
      tocs={tocs}
      footer={
        <nav className="flex justify-between gap-4 mt-14 pt-6 border-t text-sm">
          {prev ? (
            <Link href={`/${series.tag}/${prev.slug}`} className="hover:text-accent transition-colors">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/${series.tag}/${next.slug}`} className="text-right hover:text-accent transition-colors">
              {next.title} →
            </Link>
          )}
        </nav>
      }
    >
      <div
        className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-m-20"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ReaderArticle>
  );
}
```

**Step 2: Verify**

Run: `pnpm dev`. Tạo 2-3 guide qua admin (Series: System Design, section + order khác nhau), publish → hub hiện mục lục đúng thứ tự, mở chương thấy TOC + prev/next xuyên section. Chương draft không hiện.

**Step 3: Commit**

```bash
git add "app/[topic]/[...slug]"
git commit -m "feat: guide chapter page with prev/next"
```

---

### Task 10: Ba chỗ vá

**Files:**
- Modify: `app/lab/page.tsx:19`
- Modify: `app/blog/[...slug]/page.tsx` (nhánh dbPost, quanh dòng 124-127)
- Modify: `components/navbar.tsx:9-12`

**Step 1: Lab whitelist.** Dòng 19:

```ts
const LAB_TYPES = ["note", "reading", "paper"];
const labPosts = posts.filter((p) => LAB_TYPES.includes(p.type));
```

(sửa luôn comment dòng 15-17 cho khớp: guide thuộc series riêng, không thuộc lab.)

**Step 2: Blog redirect guide.** Trong `app/blog/[...slug]/page.tsx`, sau khi có `dbPost` (dòng 124), trước check `!dbPost`:

```ts
  if (dbPost && dbPost.type === "guide") {
    const series = GUIDE_SERIES.find((s) => hasTag({ tags: dbPost.tags }, s.tag));
    if (series) redirect(`/${series.tag}/${slug}`);
    notFound();
  }
```

Import `redirect` từ `next/navigation`, `GUIDE_SERIES`/`hasTag` từ `@/lib/guides`.

**Step 3: Navbar.** Thêm vào mảng nav (sau `blog`):

```ts
  { title: "system design", href: "/system-design" },
```

**Step 4: Verify**

Run: `npx tsc --noEmit` && `pnpm test` — Expected: pass toàn bộ.
Run: `pnpm dev` → `/lab` không có guide; `/blog/<slug-guide>` redirect về `/system-design/<slug>`; navbar có link mới.

**Step 5: Commit**

```bash
git add app/lab/page.tsx "app/blog/[...slug]/page.tsx" components/navbar.tsx
git commit -m "feat: wire guide series into nav, lab filter, blog redirect"
```

---

### Task 11: Verification cuối

Dùng @superpowers:verification-before-completion.

**Step 1:** `pnpm test` — toàn bộ PASS.
**Step 2:** `npx tsc --noEmit` — no errors.
**Step 3:** `pnpm build` — build sạch (cần env Supabase local như thường lệ; prebuild sync mdx chạy trước).
**Step 4:** Smoke qua `pnpm dev`: admin tạo guide → hub → chương → prev/next → redirect. Checklist từng dòng ở Task 9-10.
**Step 5:** Không commit gì thêm ở task này trừ khi có fix.
