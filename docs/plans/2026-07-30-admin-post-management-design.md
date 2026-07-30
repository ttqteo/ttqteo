# Admin Post Management — Design

Date: 2026-07-30

## Goal

Gộp `/admin` (dashboard) và `/admin/posts` thành **một màn hình quản lý bài viết**, sửa ba chỗ đang gây khó:

- **Tìm đúng bài để sửa**: stat card không lọc gì, filter mất khi rời trang, không sort được.
- **Thao tác hàng loạt chậm**: publish/unpublish/xoá phải mở từng bài.
- **Bố cục & điều hướng**: hai trang liệt kê gần như cùng dữ liệu, phải nhảy qua lại.

MDX giữ nguyên vai trò **fallback** cho lúc muốn viết bằng mdx: vẫn hiện trong danh sách, vẫn có Sync MDX, vẫn không sửa được từ admin.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Hướng thiết kế | Gộp một màn hình (`/admin` chính là danh sách bài) |
| `/admin/posts` | `redirect` về `/admin`, giữ nguyên query, để bookmark cũ không chết |
| Bộ đếm | Chuyển từ stat card sang sidebar trái, mỗi dòng là một link lọc |
| Filter / sort / search | Nằm trong URL, không phải `useState` |
| Continue writing / Recent publishes | Bỏ — chỉ là cùng dữ liệu qua bộ lọc khác |
| Bulk action trên bài mdx | Checkbox disabled, select-all chỉ quét dòng supabase |
| Phân trang | Không làm (20 bài chưa cần) |
| Editor | Giữ nguyên. Không làm panel Publish cố định kiểu WordPress |

## Layout

Cột trái ~200px, sticky dưới admin toolbar. Ba nhóm, mỗi dòng là link lọc, active state đọc từ URL:

```
status    all 20 · published 9 · drafts 11 · trash 11
type      post 17 · note 0 · reading 3 · paper 0
source    supabase 11 · mdx 9
```

Khu chính: hàng công cụ (search, sort, Sync MDX, + New) rồi tới bảng.

URL ví dụ: `/admin?status=draft&type=post&sort=title&dir=asc&q=thiet-ke`

## Table

Cột: `checkbox | title | type | source | edited | actions`

- Tiêu đề bấm được, đi thẳng vào editor (khỏi phải rê tới nút bút chì).
- Nhãn `draft` / `deleted` cạnh tiêu đề, slug ở dòng dưới.
- Sort ở header cột: `edited` (mặc định, mới nhất trước), `created`, `title`.

## Bulk actions

- Checkbox header chọn **toàn bộ dòng đang lọc**, không phải toàn bộ 20 bài.
- Thanh dính ở đáy khi có selection: `2 selected` + Publish / Unpublish / Move to trash.
- View trash: Restore / Delete permanently.
- Có lẫn mdx trong kết quả lọc thì thanh ghi rõ `2 selected · 3 mdx bỏ qua`.
- Chạy tuần tự, toast báo kết quả, **Undo cho trash**.
- Selection **reset mỗi khi filter đổi** — giữ lại là công thức xoá nhầm.

## Data flow

Không cần API mới:

| Việc | Gọi |
|---|---|
| Publish / unpublish | `PUT /api/posts/[id]` với `{ is_published }` |
| Move to trash | `DELETE /api/posts/[id]` |
| Restore | `PUT /api/posts/[id]` với `{ deleted_at: null }` |
| Delete permanently | `DELETE /api/posts/[id]?permanent=true` |

`PUT` nhận partial body: field `undefined` bị `JSON.stringify` loại bỏ nên chỉ cột được gửi mới thay đổi — luồng restore hiện tại đã dựa vào cơ chế này.

Lọc và sort chạy phía server, đọc `searchParams` (trang vốn đã `force-dynamic`). Vẫn nạp cả `active` + `trash` để tính bộ đếm: **bộ đếm phản ánh toàn bộ dữ liệu, không phải phần đang lọc** — nếu không thì "drafts 11" tụt xuống 0 ngay khi lọc sang published.

Search là client component, debounce ~250ms rồi `router.replace` để không nhồi history mỗi lần gõ một chữ.

Bulk chạy xong `router.refresh()` **một lần** ở cuối, không refresh sau mỗi bài.

## Files

| File | Việc |
|---|---|
| `app/admin/page.tsx` | Viết lại nhánh đã-đăng-nhập; nhánh login/unauthorized giữ nguyên |
| `app/admin/admin-sidebar.tsx` | Mới — bộ đếm + link lọc (server) |
| `app/admin/posts-table.tsx` | Mới — bảng, selection, bulk bar (client) |
| `app/admin/search-input.tsx` | Mới — search debounce vào URL (client) |
| `app/admin/posts/page.tsx` | Rút còn một `redirect` giữ query |
| `app/admin/posts/posts-list.tsx` | Bỏ — bị `posts-table.tsx` thay |
| `app/admin/admin-tabs.tsx` | Bỏ — sidebar thay thế |
| `app/admin/post-actions.tsx` | **Giữ nguyên** — đang chạy tốt |
| `components/admin-toolbar.tsx` | Gộp hai mục dashboard/posts còn một |
| `lib/` | Hàm thuần lọc + sort, test bằng vitest |

## Testing

- Vitest cho hàm lọc + sort: từng filter, kết hợp filter, ba kiểu sort và cả hai chiều, và **select-all chỉ trả về id supabase**.
- Phần UI không test.

## Risks

- `posts-list.tsx` bị thay gần hết.
- Bulk trash là thao tác dễ gây thiệt hại nhất → Undo trong toast là bắt buộc, không phải nice-to-have.
