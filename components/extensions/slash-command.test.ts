import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { Callout } from "./callout";
import { CodeBlockWithLanguage } from "./code-block-language";
import { PrivateNote } from "./private-note";
import { applySlashItem, filterSlashItems } from "./slash-command";
import { EditorTable } from "./table";

const ids = (query: string) => filterSlashItems(query).map((item) => item.id);

describe("filterSlashItems", () => {
  it("chưa gõ gì thì hiện đủ năm mục, theo thứ tự cố định", () => {
    expect(ids("")).toEqual(["callout", "code", "note", "quote", "table"]);
  });

  it("lọc theo tên tiếng Anh", () => {
    expect(ids("code")).toEqual(["code"]);
    expect(ids("quote")).toEqual(["quote"]);
    expect(ids("table")).toEqual(["table"]);
  });

  it("lọc theo tên tiếng Việt, có dấu hay không đều được", () => {
    expect(ids("trích")).toEqual(["quote"]);
    expect(ids("trich")).toEqual(["quote"]);
    expect(ids("ghichu")).toEqual(["note"]);
    expect(ids("bảng")).toEqual(["table"]);
    expect(ids("bang")).toEqual(["table"]);
  });

  it("không phân biệt hoa thường", () => {
    expect(ids("CALL")).toEqual(["callout"]);
  });

  it("không khớp gì thì trả mảng rỗng", () => {
    expect(ids("zzz")).toEqual([]);
  });
});

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** Một đoạn văn đang gõ dở "/<query>", con trỏ đứng cuối. */
function typed(query: string): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithLanguage,
      Callout,
      PrivateNote,
      EditorTable,
    ],
    content: `<p>Trước</p><p>/${query}</p>`,
  });
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  return editor;
}

/** Vùng "/<query>" ở đoạn cuối, như plugin suggestion trao cho command. */
function slashRange(instance: Editor, query: string) {
  const to = instance.state.selection.from;
  return { from: to - query.length - 1, to };
}

describe("applySlashItem", () => {
  it.each([
    ["callout", "cal", /<div class="callout callout-note" data-callout="note"><p><\/p><\/div>/],
    ["code", "code", /<pre[^>]*><code[^>]*><\/code><\/pre>/],
    ["note", "ghi", /<aside class="private-note" data-private-note=""><p><\/p><\/aside>/],
    ["quote", "trich", /<blockquote><p><\/p><\/blockquote>/],
  ])("%s: xoá chữ vừa gõ rồi đổi dòng đó thành khối", (id, query, expected) => {
    const e = typed(query);
    const item = filterSlashItems("").find((i) => i.id === id)!;
    applySlashItem(e, slashRange(e, query), item);
    const html = e.getHTML();
    expect(html).toMatch(expected);
    expect(html).toContain("<p>Trước</p>");
    // So trên chữ, không trên HTML: `</code>` tự nó đã chứa "/code".
    expect(e.state.doc.textContent).toBe("Trước");
  });

  it("table: xoá chữ vừa gõ rồi chèn bảng 3x3 có hàng tiêu đề, con trỏ ở ô đầu", () => {
    const e = typed("table");
    const item = filterSlashItems("").find((i) => i.id === "table")!;
    applySlashItem(e, slashRange(e, "table"), item);
    const html = e.getHTML();
    expect(html).toContain("<p>Trước</p>");
    expect(html).toContain('<div class="tableWrapper"><table');
    expect(html.match(/<th\b/g)).toHaveLength(3);
    expect(html.match(/<td\b/g)).toHaveLength(6);
    expect(e.state.doc.textContent).toBe("Trước");
    expect(e.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(e.state.selection.$from.node(-1).type.name).toBe("tableHeader");
  });
});
