# Gọn thanh công cụ editor: Design

Date: 2026-09-11

## Goal

Thanh công cụ editor đã lên 14 nút và tràn sang hàng thứ hai trên màn hẹp. Gom lại theo cách Notion và Medium làm: nút định dạng chữ chỉ hiện khi bôi đen, còn chèn khối thì đã có `/` và `+`.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Toolbar còn gì | Kiểu khối ▾, hai nút list, thụt vào / thụt ra, `+`. Sáu nút, một hàng |
| B, I, U, S, code, link | Chuyển sang bubble hiện khi bôi đen chữ |
| Undo / Redo | Bỏ nút. Ctrl+Z và Ctrl+Shift+Z vẫn chạy |
| Tạo link | Nút Link trong bubble đổi bubble thành ô nhập địa chỉ. Enter là xong, Esc là bỏ. Thay cho `window.prompt` |
| Bỏ link | Bấm nút Link khi chữ đang chọn đã là link |
| Sửa link | Như cũ: đặt con trỏ vào link thì `LinkBubble` hiện |
| Thụt vào / ra | Giữ trên toolbar. Tab vẫn chạy, nhưng không có nút thì không ai biết list lồng được |
| Header trang soạn | Copy và Xoá gom vào một nút ⋯ |

## Mỗi lúc một bubble

Editor giờ có ba bubble. Chúng không bao giờ hiện cùng lúc:

| Vùng chọn | Bubble |
|---|---|
| Con trỏ, không chọn gì, trong link | Link |
| Con trỏ trong bảng | Bảng |
| Kéo chọn nhiều ô | Bảng |
| Bôi đen chữ, kể cả trong link hay trong ô bảng | Định dạng |
| Con trỏ ở chỗ khác, chọn trong khối code, chọn nguyên một khối (ảnh, link card, đường kẻ) | Không có |

- Ba điều kiện nằm chung trong `components/editor-bubbles.ts`, để luật "mỗi lúc một bubble" đọc được ở một chỗ và test được mà không cần dựng giao diện.
- `LinkBubble` và bubble bảng chỉ hiện khi không chọn gì (bảng thì thêm trường hợp chọn nhiều ô). Trước đây bôi đen chữ trong link cũng mở `LinkBubble`. Giờ việc đó thuộc về bubble định dạng, nơi nút Link sáng lên và bấm vào là bỏ link.
- Trong khối code không có định dạng chữ, nên bubble định dạng không hiện.

## Bubble định dạng

`components/format-bubble.tsx`. Nút có tooltip ghi phím tắt: Đậm (Ctrl+B), Nghiêng (Ctrl+I), Gạch dưới (Ctrl+U), Gạch ngang (Ctrl+Shift+S), Code (Ctrl+E), Link. Nút đang áp dụng thì sáng.

- Nằm trên vùng chọn. Trên máy cảm ứng (`pointer: coarse`) thì nằm dưới, vì menu copy/dán của hệ điều hành chiếm phía trên vùng chọn.
- Chế độ nhập link: ô nhập tự focus. Enter với ô trống thì coi như bỏ. Focus rời khỏi cả bubble lẫn editor (bấm sang ô tiêu đề chẳng hạn) thì bubble ẩn luôn, không nằm lơ lửng chờ transaction kế tiếp.
- Nút dùng chung một component `BubbleButton` với bubble bảng (`components/bubble-button.tsx`).
- Như hai bubble kia, `shouldShow` và `options` nằm ở cấp module để không rơi vào vòng lặp render.

## Header

Nút ⋯ (MoreHorizontal) thay cho nút Copy và nút Xoá:

```
← ● │ [Viết][Xem trước] [⋯] [Save Draft] [Publish]

⋯  Copy Markdown
   Copy text
   ─────────────────────
   Chuyển vào thùng rác      (chỉ khi bài đã có trên server)
```

- Xoá vẫn hỏi xác nhận bằng AlertDialog như cũ, giờ mở từ mục menu nên dialog chuyển sang dạng controlled.
- Menu dùng `modal={false}`, để menu đang đóng và dialog đang mở không giành focus với nhau.
- Đang xoá thì nút ⋯ quay spinner, như nút thùng rác trước đây.
- Hai mục Copy tắt khi bài chưa có tiêu đề lẫn nội dung.

## Files

| File | Việc |
|---|---|
| `components/editor-bubbles.ts` | Mới: ba điều kiện hiện bubble |
| `components/editor-bubbles.test.ts` | Mới: bảng "mỗi lúc một bubble" ở trên |
| `components/bubble-button.tsx` | Mới: nút dùng chung, tách từ `table-bubble.tsx` |
| `components/format-bubble.tsx` | Mới |
| `tests/components/format-bubble.test.tsx` | Mới |
| `components/table-bubble.tsx` | Dùng điều kiện và nút chung |
| `components/simple-editor.tsx` | Bỏ Undo/Redo, B/I/U/S/code, Link khỏi toolbar; bỏ `addLink`; gắn bubble định dạng |
| `app/admin/edit/[id]/edit-post-client.tsx` | Nút ⋯ |

## Testing

- `editor-bubbles`: từng dòng của bảng "mỗi lúc một bubble", cộng editor chỉ đọc thì không bubble nào hiện.
- `format-bubble`: bôi đen thì hiện, bấm Đậm thì chữ đậm, Link rồi Enter thì thành link, Esc thì không.

## Không làm

- Ctrl+K để tạo link.
- Thanh định dạng dính trên bàn phím điện thoại.
