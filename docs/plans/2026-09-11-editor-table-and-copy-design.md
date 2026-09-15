# Bảng trong editor, và Copy Markdown / text: Design

Date: 2026-09-11

## Goal

- Editor soạn được bảng: chèn bằng `/` hoặc menu "Chèn", sửa hàng cột ngay trên bảng, và bảng hiện ra trên trang đọc giống hệt lúc soạn.
- Trang soạn có nút copy cả bài dưới dạng Markdown hoặc text thuần, để dán sang chỗ khác (Obsidian, GitHub, ChatGPT, tin nhắn).

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Thư viện bảng | `@tiptap/extension-table` (TableKit), cùng bản 3.31.3 với phần còn lại |
| Chèn bảng | Mục "Table" trong menu `/` và trong menu "Chèn" của toolbar. Mặc định 3x3, hàng đầu là tiêu đề |
| Sửa bảng | Bubble menu nổi trên mép trên của bảng, chỉ hiện khi con trỏ ở trong bảng |
| Kéo giãn cột | Không làm (`resizable: false`). Độ rộng cột tự chia theo nội dung |
| Gộp, tách ô | Không làm. Markdown không biểu diễn được ô gộp |
| Bảng hẹp màn điện thoại | Bọc trong `div.tableWrapper` (tuỳ chọn `renderWrapper` của tiptap), cuộn ngang được |
| Chỗ đặt nút copy | Header trang soạn, cạnh Viết / Xem trước. Một nút mở menu hai mục: Markdown, Text |
| Nội dung copy | Tiêu đề, mô tả, rồi thân bài. Là bản đang soạn, kể cả phần chưa lưu |
| Ghi chú riêng | Bị bỏ khỏi bản copy, giống màn Xem trước |

## Bảng

### Định dạng lưu

Tiptap ghi bảng ra HTML như sau, và đó là thứ nằm trong `blogs.content`:

```html
<div class="tableWrapper">
  <table style="min-width: 75px">
    <colgroup><col style="min-width: 25px">…</colgroup>
    <tbody>
      <tr><th colspan="1" rowspan="1"><p>Tên</p></th>…</tr>
      <tr><td colspan="1" rowspan="1"><p>id</p></td>…</tr>
    </tbody>
  </table>
</div>
```

Hàng tiêu đề là `<th>` nằm trong `<tbody>`, không có `<thead>`. Vì vậy style của Tailwind Typography (chỉ nhắm `thead th`) không chạm tới nó, và bảng cần CSS riêng.

Cấu hình đặt ở `components/extensions/table.ts` để editor và test dùng chung một bản.

### Chèn

- Lệnh là `/table`. Gõ `/bang` hay `/bảng` cũng ra mục này. Lệnh: `insertTable({ rows: 3, cols: 3, withHeaderRow: true })`, chạy trong cùng chain với việc xoá "/query", nên một lần undo là về như cũ.
- Chèn từ dòng trống thì bảng đứng trước dòng đó, dòng trống còn lại ngay dưới bảng để viết tiếp.
- Tab sang ô kế, Shift+Tab lùi ô, Tab ở ô cuối thêm hàng mới (có sẵn trong extension). `ListNesting` giữ Tab ở priority 1000 nhưng trả `false` khi không ở trong list, nên phím rơi xuống cho bảng.

### Bubble menu

`components/table-bubble.tsx`, dùng `BubbleMenu` của `@tiptap/react/menus` như `LinkBubble`:

| Nút | Lệnh |
|---|---|
| Thêm hàng phía trên / phía dưới | `addRowBefore` / `addRowAfter` |
| Thêm cột bên trái / bên phải | `addColumnBefore` / `addColumnAfter` |
| Xoá hàng / Xoá cột | `deleteRow` / `deleteColumn` |
| Hàng tiêu đề (bật/tắt) | `toggleHeaderRow` |
| Xoá bảng | `deleteTable` |

- Neo vào khung của cả bảng (`getReferencedVirtualElement`), đặt ở `top-start`. Neo theo con trỏ thì menu che mất hàng ngay trên ô đang sửa, thường là hàng tiêu đề.
- Ẩn khi con trỏ đang trong một link, để không chồng lên `LinkBubble`.
- `shouldShow` và `options` nằm ở cấp module, cùng lý do đã ghi ở `LINK_BUBBLE_OPTIONS`: đổi identity mỗi lần render là vòng lặp "Maximum update depth exceeded".

### CSS

Trong `globals.css`, áp cho cả `.editor-prose` (khung soạn) và `.editor-html` (Xem trước và trang đọc), để hai bên không lệch nhau:

- `.tableWrapper` cuộn ngang. Bảng rộng 100%, viền mọi ô, ô tiêu đề nền `muted` và chữ đậm.
- Đoạn văn trong ô bỏ margin, nếu không mỗi ô cao gấp đôi.
- Chỉ trong editor: `.selectedCell` có lớp phủ khi kéo chọn nhiều ô.

Bài MDX không đổi: bảng của chúng vẫn theo Typography.

## Copy Markdown / text

### Chuyển đổi

`lib/post-export.ts`, hàm thuần:

- `postToMarkdown({ title, description, content })`, `postToText(...)`
- `htmlToMarkdown(html)`, `htmlToText(html)`

Đi trên HTML đã lưu (`post.content`) bằng `DOMParser`, không đi qua schema của tiptap. Như vậy header không phải kéo cả tiptap vào chunk của nó (editor đang được tách chunk riêng), và nút copy vẫn chạy khi đang ở màn Xem trước. HTML luôn do `editor.getHTML()` sinh ra nên cấu trúc biết trước. Chỉ chạy trên trình duyệt.

| Khối | Markdown | Text |
|---|---|---|
| Tiêu đề bài | `# Tiêu đề` | dòng tiêu đề |
| `h1`…`h3` | `#`…`###` | dòng chữ |
| List | `- ` / `1. ` (giữ `start`), lồng thì thụt theo độ rộng dấu | như Markdown |
| Trích dẫn | `> ` | chỉ nội dung |
| Callout | GitHub alert: `> [!NOTE]`, `[!TIP]`, `[!WARNING]`, `danger` thành `[!CAUTION]` | chỉ nội dung |
| Khối code, mermaid | fence có ngôn ngữ, fence dài hơn chuỗi backtick dài nhất bên trong | code nguyên văn |
| Bảng | bảng GFM, hàng đầu làm tiêu đề, `\|` được escape, hàng thiếu ô được đệm | mỗi hàng một dòng, ô cách nhau bằng Tab (dán vào Sheets ra đúng ô) |
| Link card | `[tiêu đề](url)`, không có tiêu đề thì `<url>` | tiêu đề rồi url ở dòng dưới |
| Ảnh | `![alt](src)` | bỏ |
| Đường kẻ | `---` | `---` |
| Ghi chú riêng | bỏ | bỏ |
| Đậm, nghiêng, gạch, code | `**`, `*`, `~~`, backtick | chữ trơn |
| Gạch dưới | chữ trơn (Markdown không có) | chữ trơn |
| Link | `[chữ](url)`, chữ trùng url thì `<url>` | chỉ chữ |
| Xuống dòng cứng | `\` cuối dòng | xuống dòng |

- Khoảng trắng ở mép một đoạn in đậm được đưa ra ngoài dấu (`a **đậm** b`), vì `**đậm **` không phải cú pháp hợp lệ.
- Chữ thường được escape các ký tự Markdown (`\ * _ [ ] ~ \``), và các dấu đầu dòng dễ bị hiểu nhầm (`#`, `>`, `- `, `1. `). Bản text không escape gì.
- Dòng trống trong editor (`<p></p>`) bị bỏ, vì giữa hai khối đã có một dòng trống.

### Nút

- Header trang soạn, ngay sau cụm Viết / Xem trước: nút icon viền như nút xoá, tooltip "Copy bài". Menu hai mục: "Copy Markdown", "Copy text".
- Thành công: toast "Đã copy Markdown" / "Đã copy text". Trình duyệt không có clipboard API hoặc bị từ chối: toast lỗi, như nút copy của khối code.
- Tắt khi bài chưa có tiêu đề lẫn nội dung.

## Files

| File | Việc |
|---|---|
| `package.json`, `pnpm-lock.yaml` | Thêm `@tiptap/extension-table` |
| `components/extensions/table.ts` | Mới: TableKit đã cấu hình |
| `components/extensions/table.test.ts` | Mới: HTML đúng như trên, và đọc lại ra y hệt |
| `components/extensions/slash-command.tsx` | Mục "Table" |
| `components/extensions/slash-command.test.ts`, `tests/components/slash-command-menu.test.tsx` | Năm mục thay vì bốn, và test chèn bảng |
| `components/table-bubble.tsx` | Mới: bubble menu |
| `tests/components/table-bubble.test.tsx` | Mới: test khói cho bubble menu |
| `components/simple-editor.tsx` | Nạp bảng, mục "Table" trong menu Chèn, gắn bubble |
| `app/globals.css` | Style bảng |
| `lib/post-export.ts`, `lib/post-export.test.ts` | Mới: chuyển HTML sang Markdown và text |
| `app/admin/edit/[id]/edit-post-client.tsx` | Nút copy |

## Testing

Vitest, như các phần trước. Nút copy không test riêng, nó chỉ gọi hai hàm thuần bên dưới.

- `post-export`: từng dòng của bảng chuyển đổi ở trên, cộng escape, khoảng trắng quanh dấu đậm, list lồng có `start`, bảng thiếu ô, và một bài dựng từ HTML thật của tiptap (có `colgroup` và `tableWrapper`).
- `table`: HTML sinh ra có `tableWrapper` và `<th>`, và `generateHTML(generateJSON(html))` ra y hệt.
- Slash: `/table` chèn bảng 3x3 có hàng tiêu đề, chữ đã gõ bị xoá.
- Bubble menu, qua `EditorContent` thật và render lại ở mọi transaction như `SimpleEditor`: hiện khi con trỏ trong bảng, ẩn khi ra ngoài, nút thêm hàng chạy. Test này cũng bắt được vòng lặp render khi một prop của `BubbleMenu` đổi identity.

## Không làm

- Kéo giãn cột, gộp tách ô, căn lề trong ô.
- Dán Markdown vào editor thành bảng.
- Nút copy trên trang đọc công khai.
