import { Selection, TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

/**
 * Đưa con trỏ lên đầu nội dung, sẵn để gõ. Enter ở tiêu đề và Tab ở mô tả đi
 * qua đây.
 *
 * Bài mở đầu bằng ảnh, link card hay đường kẻ thì `focus("start")` chọn nguyên
 * khối đó, và phím gõ ngay sau sẽ thay mất nó. Khi ấy chèn một đoạn trống lên
 * trên cùng để gõ vào.
 */
export function focusContentStart(editor: Editor): void {
  if (Selection.atStart(editor.state.doc) instanceof TextSelection) {
    editor.commands.focus("start");
    return;
  }
  editor.chain().insertContentAt(0, { type: "paragraph" }).focus("start").run();
}
