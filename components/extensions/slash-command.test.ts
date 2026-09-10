import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { Callout } from "./callout";
import { CodeBlockWithLanguage } from "./code-block-language";
import { PrivateNote } from "./private-note";
import { applySlashItem, filterSlashItems } from "./slash-command";

const ids = (query: string) => filterSlashItems(query).map((item) => item.id);

describe("filterSlashItems", () => {
  it("chưa gõ gì thì hiện đủ bốn mục, theo thứ tự cố định", () => {
    expect(ids("")).toEqual(["callout", "code", "note", "quote"]);
  });

  it("lọc theo tên tiếng Anh", () => {
    expect(ids("code")).toEqual(["code"]);
    expect(ids("quote")).toEqual(["quote"]);
  });

  it("lọc theo tên tiếng Việt, có dấu hay không đều được", () => {
    expect(ids("trích")).toEqual(["quote"]);
    expect(ids("trich")).toEqual(["quote"]);
    expect(ids("ghichu")).toEqual(["note"]);
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
});
