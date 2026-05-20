# Resume Popup — Design

Date: 2026-05-20

## Goal

Khi user quay lại web, hiện popup gợi ý tiếp tục công việc trước:

- **Reader resume** (mọi user): quay lại bài blog đang đọc + scroll tới vị trí cũ.
- **Writer resume** (chỉ admin): quay lại bài đang viết dở gần nhất. Xoá khi logout.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Khi nào hiện popup | Mọi trang, 1 lần / session (sessionStorage flag) |
| Đang ở đúng trang đó | Không hiện popup (reader vẫn auto-scroll) |
| TTL | Reader 7 ngày, Writer 30 ngày |
| Khi cả hai cùng có | Hiện lần lượt: writer trước, sau đó reader |

## Storage

`localStorage` keys:

```
ttqteo:reader-resume = { slug, title, scrollPct, headingId?, updatedAt }
ttqteo:writer-resume = { postId, title, route, updatedAt }
```

`sessionStorage`:

```
ttqteo:resume-shown = "1"   # set sau lần điều phối đầu tiên trong tab
```

## Architecture

### Tracking

- **Reader**: `ReaderProgressTracker` client mount trong `app/blog/[...slug]/page.tsx`. Throttle scroll 1s, lưu `scrollPct` + heading hiện tại (đọc từ TocObserver / closest `[id]`). Bỏ qua khi `scrollPct < 0.05`.
- **Writer**: hook trong `app/admin/edit/[id]/edit-post-client.tsx`. Debounce 2s mỗi khi state thay đổi → ghi `{ postId, title, route }`. Khi publish / delete thành công → `clearWriterResume()` nếu trùng id.

### Orchestrator

`components/resume/resume-orchestrator.tsx`, mount ở root layout với prop `isAdmin` (resolve server-side trong `app/layout.tsx`).

Mỗi mount session:

1. Nếu `sessionStorage["ttqteo:resume-shown"]` đã set → skip.
2. Nếu admin + có writer entry hợp lệ + URL hiện tại ≠ `entry.route` → mở writer dialog.
3. Khi writer dialog đóng (không confirm) → 200ms sau check reader entry, nếu hợp lệ + URL hiện tại ≠ `/blog/${slug}` → mở reader dialog.
4. Set sessionStorage flag.

Hợp lệ = chưa hết TTL.

### Dialogs

- `ResumeReaderDialog` — title, vị trí (`headingText` hoặc `~ X%`), thời điểm cập nhật, nút [Bỏ qua] [Tiếp tục đọc].
- `ResumeWriterDialog` — title (hoặc "Untitled draft"), thời điểm cập nhật, nút [Để sau] [Mở bài viết].
- Confirm → `router.push`. Dismiss → đóng, **không** xoá entry.

### Scroll restoration

`ScrollRestorer` mount trong blog page. Nếu URL match `reader-resume.slug` và URL không có hash, sau hydration `window.scrollTo({ top: pct * docHeight })`.

### Logout cleanup

`components/admin/logout-form.tsx` wraps form logout. `onSubmit`: `clearWriterResume()` rồi submit native (POST → server signOut → redirect).

## Files

### New

- `lib/resume-storage.ts` — typed get/set/clear, TTL check, SSR-safe.
- `components/resume/reader-progress-tracker.tsx`
- `components/resume/scroll-restorer.tsx`
- `components/resume/resume-orchestrator.tsx`
- `components/resume/resume-reader-dialog.tsx`
- `components/resume/resume-writer-dialog.tsx`
- `components/admin/logout-form.tsx`
- `lib/resume-storage.test.ts` (vitest)

### Modified

- `app/layout.tsx` — gọi `isAdmin()`, render orchestrator.
- `app/blog/[...slug]/page.tsx` — mount tracker + scroll restorer.
- `app/admin/edit/[id]/edit-post-client.tsx` — write/clear writer entry.
- `components/admin-toolbar.tsx` — đổi form logout sang `<LogoutForm>`.

## Edge cases

- Heading id đổi → fallback `scrollPct`.
- Bài bị xoá / unpublish → click "Tiếp tục đọc" có thể 404 (chấp nhận, hiếm).
- Private mode / localStorage disabled → utility try/catch, im lặng skip.
- Nhiều tab → flag per-session per-tab, không đồng bộ liên tab (không cần).

## Out of scope

- Không sync resume qua Supabase / cross-device.
- Không track resume cho docs (`/docs/*`), chỉ blog.
- Không có "Tắt vĩnh viễn" toggle (YAGNI, có thể thêm sau nếu cần).
