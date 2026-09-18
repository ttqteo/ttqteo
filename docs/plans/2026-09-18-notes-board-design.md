# Ghi chú: một trang kiểu Keep

Date: 2026-09-18

## Goal

`/admin/notes` (ghi chú riêng trong bài) và `/admin/quick-notes` (Ghi nhanh) đều là ghi chú, chỉ khác chỗ lưu. Gộp thành một trang, bố cục như Google Keep: lưới thẻ, ghim lên đầu, link có preview ở chân thẻ, mở note trong hộp thoại.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Đường dẫn | Giữ `/admin/notes`. `/admin/quick-notes` chỉ còn redirect về đây |
| Vào từ đâu | Toolbar còn một mục `notes` (icon sticky note như rail). Nút mở rộng và link ở chân panel Ghi nhanh đều về đây |
| Dữ liệu | Ghi nhanh từ store của side panel (bật khi pathname là trang này). Ghi chú trong bài lấy ở server bằng `getPostsWithPrivateNotes`, đưa xuống client làm prop |
| Sắp xếp | Nhóm **Ghim** (ghi nhanh đã ghim), rồi **Khác**: hai loại trộn chung theo lần sửa gần nhất. Mỗi ghi chú trong bài là một thẻ, giữ thứ tự trong bài |
| Lọc, tìm | Ba nút Tất cả · Ghi nhanh · Trong bài. Tìm không phân biệt dấu trên cả hai loại; với ghi chú trong bài tìm cả tên bài, chữ lấy từ HTML bỏ tag (`htmlText`) |
| Lưới | CSS columns 1 đến 4 cột, thẻ `break-inside-avoid`. Không dùng JS masonry |
| Thẻ ghi nhanh | Tiêu đề đậm, tới 12 dòng xem trước, URL trong chữ vẫn thành chip. Chân thẻ là preview link đầu tiên kiểu Keep: ảnh og hoặc khung hình YouTube (không có thì favicon), tiêu đề trang, tên miền, và "+n" nếu còn link |
| Thẻ ghi chú trong bài | Hộp viền đứt màu hổ phách như trong editor, nhãn "ghi chú trong bài", HTML qua `PostHtml`, cắt ở 18rem. Chỉ đọc; chip tên bài ở chân thẻ (chấm xanh hoặc vàng theo published/draft) mở editor bài đó. Thẻ không phải link vì code block bên trong có nút copy |
| Sửa ghi nhanh | Hộp thoại giữa màn hình (`Dialog`), bên trong là `NoteEditor` của panel. Đóng, Esc hay bấm ra ngoài đều lưu và bỏ note trống, như rời note trong panel |
| Cache unfurl | Lưu localStorage 7 ngày (`ttqteo:unfurl:v1`), tối đa 200 URL, nên mỗi thẻ hỏi link đầu của nó đúng một lần. Lần hỏi hỏng chỉ nhớ trong phiên, để tải lại thì hỏi lại |
| Màu note, nhãn | Không làm, theo quyết định của chủ site |

Ngoài lề, cùng đợt: agenda của Calendar không còn báo "Chưa nối lịch Google" khi thiếu `ADMIN_CALENDAR_FEEDS`; agenda khi đó chỉ là task trong ngày.

## Files

| File | Việc |
|---|---|
| `lib/notes-board.ts` | Mới, thuần: gộp, lọc, tìm, sắp xếp hai loại ghi chú; `htmlText` |
| `lib/note-links.ts` | Thêm `linkHost` |
| `components/admin/side-panel/unfurl-cache.ts` | Lưu và đọc localStorage |
| `components/admin/side-panel/note-links.tsx` | Thêm `LinkPreview` cho chân thẻ |
| `components/admin/side-panel/notes-panel.tsx` | `NoteEditor` nhận `headerClassName`; link chân panel |
| `components/admin/side-panel/panels.ts`, `components/admin-toolbar.tsx` | Ghi nhanh trỏ về `/admin/notes`; toolbar bớt một mục |
| `components/admin/side-panel/day-agenda.tsx` | Bỏ dòng chưa nối lịch |
| `app/admin/notes/notes-board.tsx`, `page.tsx`, `loading.tsx` | Trang mới |
| `app/admin/quick-notes/page.tsx` | Redirect |

## Testing

Vitest cho `notes-board` (ghim, trộn theo thời gian, mỗi note trong bài một thẻ, lọc, tìm cả tên bài), `note-links` (`linkHost`), và `unfurl-cache` (đọc lại sau reload, hết hạn sau một tuần, storage bị chặn vẫn chạy). UI không test.
