# Guide Series (kiểu Hello Interview) - Design

Date: 2026-07-30

## Goal

Viết về system design trên site, gồm hai loại nội dung:

- **Handbook**: các chương có cấu trúc (Concepts → Technologies → Problems), đọc theo lộ trình như Hello Interview, không theo ngày đăng.
- **Field notes**: bài kinh nghiệm thực tế, vẫn là blog post bình thường.

Cả hai đều viết bằng **admin editor hiện tại (TipTap + Supabase)**. Không dùng lại scaffold `/docs` MDX (đang bỏ trống, nuôi hai pipeline nội dung là chi phí dai dẳng với solo dev). Thiết kế mở rộng được sang topic khác (database, frontend...) mà không đập route.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Viết ở đâu | Admin editor (TipTap + Supabase), cùng bảng `blogs` |
| Phân biệt chương vs bài kinh nghiệm | Post type mới `guide`; bài kinh nghiệm giữ type `post` |
| Topic là gì | Topic = tag. Series = tag được "thăng cấp" trong config `lib/guides.ts` |
| Cột `guide_topic` riêng | Không cần, tag đảm nhiệm luôn |
| Section + thứ tự chương | 2 cột DB `guide_section` + `guide_order`, chỉnh hoàn toàn trên web qua admin (đã cân nhắc để ordering trong config nhưng chốt là mọi thao tác với chương không được yêu cầu deploy) |
| Danh sách section của một series | Config trong repo (đổi hiếm, chấp nhận deploy), không xây UI quản lý section |
| Route | Dynamic `app/[topic]/` + `app/[topic]/[slug]/`, `generateStaticParams` từ config |
| Một chương thuộc 2 series | Được (gắn 2 tag); prev/next tính theo topic trong URL nên không nhập nhằng |
| Field notes của series | Blog post (type `post`) có tag trùng tag series, tự động xuất hiện |

## Data

Migration `supabase/add_blogs_guide_columns.sql` (theo pattern các file `supabase/*.sql` cũ):

```sql
-- CHECK constraint hiện tại chỉ cho phép post/note/reading/paper
ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_type_check;
ALTER TABLE blogs ADD CONSTRAINT blogs_type_check
  CHECK (type IN ('post', 'note', 'reading', 'paper', 'guide'));

ALTER TABLE blogs ADD COLUMN IF NOT EXISTS guide_section text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS guide_order numeric;
```

`guide_order` là numeric để chèn chương giữa chừng (`2.5`) không phải đánh số lại. Hai cột chỉ có nghĩa khi `type = 'guide'`.

## Config `lib/guides.ts`

```ts
export type GuideSeries = {
  tag: string; // vừa là tag vừa là URL segment: "system-design"
  title: string;
  description: string;
  sections: { key: string; title: string }[]; // theo thứ tự hiển thị
};

export const GUIDE_SERIES: GuideSeries[] = [
  {
    tag: "system-design",
    title: "System Design",
    description: "...",
    sections: [
      { key: "concepts", title: "Core Concepts" },
      { key: "technologies", title: "Key Technologies" },
      { key: "problems", title: "Common Problems" },
    ],
  },
];
```

Kèm các hàm thuần (unit-test được):

- `getSeriesByTag(tag)` - tra config.
- `groupChapters(posts, series)` - lọc post type `guide` có tag series, gom theo `guide_section`, sort theo `guide_order`. Chương có section lạ hoặc thiếu order rơi vào cuối, không biến mất.
- `flattenChapters(grouped)` + `prevNext(flat, slug)` - danh sách phẳng xuyên section để tính prev/next.

## Plumbing (`lib/posts.ts`, `lib/admin-posts.ts`)

- `PostType` thêm `"guide"`; `UnifiedPost` thêm `guideSection?` / `guideOrder?`.
- `selectPostRows` xin thêm 2 cột mới, fallback theo đúng pattern graceful-degradation sẵn có (DB chưa migrate thì site vẫn sống).
- `ViewKey` + `VIEWS` thêm `"guide"` → admin sidebar tự có filter + counter.

## Admin editor

Trong [edit-post-client.tsx](../../app/admin/edit/[id]/edit-post-client.tsx):

- Thêm `Guide` vào Select type.
- Khi type = guide, hiện thêm 3 field:
  1. **Series**: dropdown đọc từ `GUIDE_SERIES` (chọn xong tự thêm tag tương ứng, không gõ tay → không typo).
  2. **Section**: dropdown theo series đã chọn.
  3. **Order**: ô nhập số.

## Public routes

**Hub `app/[topic]/page.tsx`** (`dynamicParams = false`, params từ config → topic lạ 404 từ build):

- Giới thiệu series (title + description từ config).
- Mục lục theo section, mỗi section liệt kê chương theo order.
- Khối "Field notes": post type `post` cùng tag, mới nhất trước.
- Dữ liệu qua `supabasePublic` + `revalidate = 300`, giữ hướng static của commit 86b4890.

**Chương `app/[topic]/[slug]/page.tsx`**:

- Tách phần render bài Supabase (TOC, ReaderContent, progress tracker...) trong trang blog thành component dùng chung, không copy.
- Khác blog: back link về hub, prev/next chapter cuối bài.
- `generateStaticParams` cho guide đã publish, `dynamicParams = true`, `revalidate = 300`.

Next.js ưu tiên static segment nên `/blog`, `/lab`, `/admin`... không bị dynamic `[topic]` nuốt.

## Chỗ phải vá

1. [app/lab/page.tsx](../../app/lab/page.tsx) lọc `type !== "post"` → đổi thành whitelist `note/reading/paper`, không thì guide lọt vào lab.
2. `/blog/<slug-guide>`: query theo slug không check type nên sẽ render guide như blog post → nếu type `guide` và có tag series thì `redirect` về `/<topic>/<slug>` (URL chính tắc duy nhất), không có series thì 404.
3. Nav site thêm link tới `/system-design`.

## Testing

- Unit test vitest cho logic thuần trong `lib/guides.ts`: gom nhóm, sort, prev/next xuyên section, chương thiếu section/order, chương thuộc 2 series.
- Kiểm tra test hiện có của `lib/admin-posts.ts` khi thêm view `guide`.

## Out of scope (YAGNI)

- UI quản lý section trong DB, drag-drop reorder chương.
- Progress/completion tracking theo series (ReaderProgressTracker sẵn có là đủ).
- Search trong series.
- Xóa scaffold `/docs` MDX: làm sau, việc dọn dẹp độc lập với feature này.
