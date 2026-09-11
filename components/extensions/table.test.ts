import { generateHTML, generateJSON } from "@tiptap/html";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { EditorTable } from "./table";

const extensions = [StarterKit, EditorTable];

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** HTML của một bảng 2x2 vừa chèn vào dòng trống, đúng thứ sẽ nằm trong database. */
function inserted(): string {
  editor = new Editor({
    element: document.createElement("div"),
    extensions,
    content: "<p></p>",
  });
  editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
  return editor.getHTML();
}

describe("EditorTable", () => {
  it("bọc bảng trong tableWrapper để cuộn ngang được trên điện thoại", () => {
    expect(inserted()).toMatch(/^<div class="tableWrapper"><table[^>]*><colgroup>/);
  });

  it("hàng đầu là ô tiêu đề, các hàng sau là ô thường", () => {
    const html = inserted();
    expect(html.match(/<th\b/g)).toHaveLength(2);
    expect(html.match(/<td\b/g)).toHaveLength(2);
  });

  it("đọc lại HTML đã lưu ra y hệt", () => {
    const once = inserted();
    expect(generateHTML(generateJSON(once, extensions), extensions)).toBe(once);
  });
});
