import { Extension, type Editor } from "@tiptap/react";
import { INDENT } from "./code-auto-pairs";

/**
 * Vị trí (tính trong chữ của khối code) của đầu các dòng mà vùng chọn chạm
 * tới. Vùng chọn dừng ngay đầu một dòng thì dòng đó không tính: kéo chọn trọn
 * vài dòng thường dừng ở đầu dòng kế tiếp.
 */
export function lineStartsIn(text: string, from: number, to: number): number[] {
  const starts = [text.lastIndexOf("\n", from - 1) + 1];
  for (let i = text.indexOf("\n", from); i !== -1 && i + 1 < to; i = text.indexOf("\n", i + 1)) {
    starts.push(i + 1);
  }
  return starts;
}

/** Khối code chứa trọn vùng chọn, hoặc null. */
function codeSelection(editor: Editor) {
  const { $from, $to, empty } = editor.state.selection;
  if (!$from.parent.type.spec.code || !$from.sameParent($to)) return null;
  return {
    empty,
    start: $from.start(),
    text: $from.parent.textContent,
    lines: lineStartsIn($from.parent.textContent, $from.parentOffset, $to.parentOffset),
  };
}

function indentCode(editor: Editor): boolean {
  const code = codeSelection(editor);
  if (!code) return false;
  const tr = editor.state.tr;
  if (code.empty) {
    tr.insertText(INDENT);
  } else {
    // Từ dòng cuối lên, để chữ chèn ở dòng dưới không làm lệch vị trí dòng trên.
    for (const line of [...code.lines].reverse()) tr.insertText(INDENT, code.start + line);
  }
  editor.view.dispatch(tr);
  return true;
}

function outdentCode(editor: Editor): boolean {
  const code = codeSelection(editor);
  if (!code) return false;
  const tr = editor.state.tr;
  for (const line of [...code.lines].reverse()) {
    const rest = code.text.slice(line);
    const width = rest.startsWith("\t")
      ? 1
      : Math.min(/^ */.exec(rest)![0].length, INDENT.length);
    if (width) tr.delete(code.start + line, code.start + line + width);
  }
  if (tr.docChanged) editor.view.dispatch(tr);
  // true cả khi không còn gì để lùi: Shift+Tab trong code không được đẩy tiêu
  // điểm ra khỏi editor.
  return true;
}

/**
 * Tab và Shift+Tab trong khối code: thụt vào, thụt ra hai dấu cách, cho mọi
 * dòng vùng chọn chạm tới. Không có nó thì Tab rơi xuống trình duyệt và tiêu
 * điểm nhảy ra khỏi editor.
 *
 * Tự viết thay vì bật `enableTabIndentation` của CodeBlock: bản đó thụt từ chỗ
 * vùng chọn bắt đầu chứ không từ đầu dòng, và nằm dưới phím Tab của list.
 */
export const CodeIndent = Extension.create({
  name: "codeIndent",
  // Trên ListNesting (1000) và Tab của list item: khối code nằm trong một mục
  // list thì Tab phải thụt code, không phải thụt cả mục list.
  priority: 1100,

  addKeyboardShortcuts() {
    return {
      Tab: () => indentCode(this.editor),
      "Shift-Tab": () => outdentCode(this.editor),
    };
  },
});
