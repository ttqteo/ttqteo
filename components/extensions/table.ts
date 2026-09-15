import { TableKit } from "@tiptap/extension-table";

/**
 * Bảng của editor. Cấu hình nằm riêng ở đây để editor và test dùng chung một
 * bản, như `CodeBlockWithLanguage`.
 *
 * `renderWrapper` bọc bảng trong `div.tableWrapper` ngay trong HTML đã lưu.
 * Trang đọc không có JavaScript nào chạm tới bảng, nên cái vỏ này là thứ duy
 * nhất để một bảng rộng cuộn ngang được trên điện thoại thay vì tràn khỏi cột
 * chữ (xem globals.css). Đọc lại vẫn đúng: không có quy tắc parse nào nhận một
 * `div` trần, nên ProseMirror đi thẳng vào `<table>` bên trong.
 *
 * Không bật `resizable`: kéo giãn cột ghi độ rộng pixel vào từng `<col>`, và
 * độ rộng đo trên màn soạn thì sai trên màn đọc hẹp hơn.
 */
export const EditorTable = TableKit.configure({
  table: { renderWrapper: true },
});
