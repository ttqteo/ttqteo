# Ghi nhanh: Link và YouTube

Date: 2026-09-18

## Goal

Một note trong Ghi nhanh thường chỉ là vài link chép vội. Hiện chúng là chữ thuần: link dài (kèm `?fbclid=…`) tràn sáu dòng trong thẻ, không bấm được, và link YouTube không khác gì chữ. Cần hiện chúng cho ra link, và cho YouTube xem được ngay trong panel.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Note vẫn là text thuần? | Có. Textarea giữ nguyên; link được nhận ra lúc hiện, không đổi định dạng lưu |
| Trong thẻ note | Mỗi URL trong tiêu đề và ba dòng xem trước thành một chip: host và path, bỏ `www.`, query và fragment. YouTube thì chip mang khung hình nhỏ và chữ "YouTube". Thẻ là `<button>` nên chip không phải link; bấm thẻ là vào note, ở đó link bấm được |
| Trong note đang sửa | Dưới textarea là danh sách thẻ link, kiểu Keep. Link thường: favicon, tiêu đề, mô tả, ảnh og nhỏ, mở tab mới. YouTube: khung hình 16:9 với nút play, bấm thì thay bằng player (`youtube-nocookie`, `autoplay=1`) tại chỗ |
| Tiêu đề lấy từ đâu | Route `POST /api/admin/unfurl` đang có của editor. Chỉ hỏi khi đang mở note, tối đa 8 link đầu, và chỉ khi link đã đứng yên 800ms, để URL đang gõ dở không bị hỏi |
| Cache | Một store nhỏ trong module (`unfurl-cache.ts`), sống suốt trang, tối đa 200 URL, đọc bằng `useSyncExternalStore`. Thẻ note không hỏi route, chỉ hiện tiêu đề nếu note đã được mở trong phiên |
| Khung hình YouTube | `i.ytimg.com/vi/{id}/mqdefault.jpg`, không cần API. Ảnh hỏng thì tự ẩn |
| Link nằm giữa câu | Vẫn nhận ra. Dấu câu và ngoặc đóng đi sau link bị cắt, nhưng ngoặc mà chính URL mở ra (`Foo_(bar)`) thì giữ |

## Files

| File | Việc |
|---|---|
| `lib/note-links.ts` | Mới, thuần: tách text thành chữ và link, gom link của note, nhãn ngắn cho một URL |
| `lib/youtube.ts` | Thêm `youtubeThumbnailSrc` |
| `components/admin/side-panel/unfurl-cache.ts` | Mới: cache kết quả unfurl, gộp request trùng, nhớ cả lần hỏi hỏng |
| `components/admin/side-panel/note-links.tsx` | Mới: `LinkedText` cho thẻ, `NoteLinks` cho note đang sửa |
| `components/admin/side-panel/notes-panel.tsx` | Thẻ dùng `LinkedText`; editor thêm `NoteLinks` dưới textarea |

## Testing

Vitest cho `note-links` (link giữa câu, dấu câu, ngoặc, slug tiếng Việt), `youtube` (khung hình), `unfurl-cache` (hỏi một lần, gộp request, nhớ lỗi, đầy thì bỏ cũ nhất), và một smoke test render cho `note-links.tsx` (chip, link mở tab mới, tiêu đề điền sau khi route trả lời, play tại chỗ, chờ link đứng yên).

## Không làm

- Sửa note bằng editor rich text, hay linkify ngay trong textarea.
- Hỏi unfurl cho mọi note trong danh sách: vài chục request server-side mỗi lần mở panel.
- Lưu cache unfurl qua reload.
