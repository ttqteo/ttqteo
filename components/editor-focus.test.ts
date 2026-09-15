import Image from "@tiptap/extension-image";
import { TextSelection } from "@tiptap/pm/state";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { focusContentStart, resumeWriting } from "./editor-focus";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function open(content: string): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, Image],
    content,
  });
  return editor;
}

describe("focusContentStart", () => {
  it("bài trống: con trỏ vào đoạn duy nhất", () => {
    const e = open("");
    focusContentStart(e);
    expect(e.state.selection.from).toBe(1);
    expect(e.getHTML()).toBe("<p></p>");
  });

  it("về đầu đoạn đầu tiên dù con trỏ đang ở cuối bài, nội dung giữ nguyên", () => {
    const e = open("<p>Mở bài</p><p>Thân bài</p>");
    e.commands.setTextSelection(e.state.doc.content.size - 1);
    focusContentStart(e);
    expect(e.state.selection.empty).toBe(true);
    expect(e.state.selection.from).toBe(1);
    expect(e.getHTML()).toBe("<p>Mở bài</p><p>Thân bài</p>");
  });

  it("đầu bài là list: con trỏ vào đầu chữ của mục đầu", () => {
    const e = open("<ul><li><p>Mục một</p></li></ul>");
    focusContentStart(e);
    const { $from } = e.state.selection;
    expect($from.parent.textContent).toBe("Mục một");
    expect($from.parentOffset).toBe(0);
  });

  it("đầu bài là ảnh: chèn đoạn trống lên trên chứ không chọn ảnh", () => {
    const e = open('<img src="https://a.dev/x.png"><p>Sau ảnh</p>');
    focusContentStart(e);

    const { selection, doc } = e.state;
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.$from.parent).toBe(doc.child(0));
    expect(doc.child(0).type.name).toBe("paragraph");
    expect(doc.child(0).content.size).toBe(0);
    // Ảnh vẫn còn, ngay dưới đoạn mới.
    expect(doc.child(1).type.name).toBe("image");
    expect(doc.child(2).textContent).toBe("Sau ảnh");
  });
});

describe("resumeWriting", () => {
  it("chưa gõ gì từ lúc mở trang: xuống cuối bài", () => {
    const e = open("<p>Mở bài</p><p>Đang viết dở</p>");
    resumeWriting(e, false);
    const { $from } = e.state.selection;
    expect($from.parent.textContent).toBe("Đang viết dở");
    expect($from.parentOffset).toBe("Đang viết dở".length);
  });

  it("đang gõ dở ở giữa bài: về đúng chỗ đó", () => {
    const e = open("<p>Mở bài</p><p>Đang viết dở</p>");
    e.commands.setTextSelection(3);
    resumeWriting(e, true);
    expect(e.state.selection.from).toBe(3);
  });
});
