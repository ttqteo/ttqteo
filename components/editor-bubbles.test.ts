import { NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import {
  formatBubbleShouldShow,
  linkBubbleShouldShow,
  tableBubbleShouldShow,
} from "./editor-bubbles";
import { EditorTable } from "./extensions/table";

const CONTENT = [
  "<p>Java là ngôn ngữ</p>",
  '<p>Xem <a href="https://a.dev">trang này</a> nhé</p>',
  "<pre><code>int x = 1;</code></pre>",
  "<hr>",
  "<table><tbody>",
  "<tr><th><p>Tên</p></th><th><p>Kiểu</p></th></tr>",
  "<tr><td><p>id</p></td><td><p>uuid</p></td></tr>",
  "</tbody></table>",
].join("");

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function open(): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, EditorTable],
    content: CONTENT,
  });
  return editor;
}

/** Vị trí ký tự đầu của `text` trong tài liệu. */
function posOf(e: Editor, text: string): number {
  let at = -1;
  e.state.doc.descendants((node, pos) => {
    if (at === -1 && node.isText && node.text!.includes(text)) {
      at = pos + node.text!.indexOf(text);
    }
    return at === -1;
  });
  return at;
}

const caretIn = (e: Editor, text: string) => e.commands.setTextSelection(posOf(e, text) + 1);

const select = (e: Editor, text: string) => {
  const from = posOf(e, text);
  e.commands.setTextSelection({ from, to: from + text.length });
};

/** Tên các bubble muốn hiện với vùng chọn hiện tại. */
function shown(e: Editor): string[] {
  const bubbles = {
    format: formatBubbleShouldShow,
    link: linkBubbleShouldShow,
    table: tableBubbleShouldShow,
  };
  return Object.entries(bubbles)
    .filter(([, shouldShow]) => shouldShow({ editor: e }))
    .map(([name]) => name);
}

describe("mỗi lúc chỉ một bubble", () => {
  it("con trỏ trong đoạn thường: không bubble nào", () => {
    const e = open();
    caretIn(e, "Java");
    expect(shown(e)).toEqual([]);
  });

  it("bôi đen chữ: bubble định dạng", () => {
    const e = open();
    select(e, "Java");
    expect(shown(e)).toEqual(["format"]);
  });

  it("con trỏ trong link: bubble link", () => {
    const e = open();
    caretIn(e, "trang");
    expect(shown(e)).toEqual(["link"]);
  });

  it("bôi đen chữ trong link: bubble định dạng chứ không phải bubble link", () => {
    const e = open();
    select(e, "trang");
    expect(shown(e)).toEqual(["format"]);
  });

  it("con trỏ trong ô bảng: bubble bảng", () => {
    const e = open();
    caretIn(e, "uuid");
    expect(shown(e)).toEqual(["table"]);
  });

  it("bôi đen chữ trong ô bảng: bubble bảng nhường cho bubble định dạng", () => {
    const e = open();
    select(e, "uuid");
    expect(shown(e)).toEqual(["format"]);
  });

  it("kéo chọn nhiều ô: bubble bảng", () => {
    const e = open();
    // Vị trí của một ô là ngay trước nó: lùi qua thẻ mở của đoạn và của ô.
    const selection = CellSelection.create(e.state.doc, posOf(e, "Tên") - 2, posOf(e, "Kiểu") - 2);
    e.view.dispatch(e.state.tr.setSelection(selection));
    expect(shown(e)).toEqual(["table"]);
  });

  it("bôi đen trong khối code: không bubble nào", () => {
    const e = open();
    select(e, "int");
    expect(shown(e)).toEqual([]);
  });

  it("chọn nguyên một khối: không bubble nào", () => {
    const e = open();
    let rule = -1;
    e.state.doc.descendants((node, pos) => {
      if (node.type.name === "horizontalRule") rule = pos;
    });
    e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, rule)));
    expect(shown(e)).toEqual([]);
  });

  it("editor chỉ đọc: không bubble nào", () => {
    const e = open();
    select(e, "Java");
    e.setEditable(false);
    expect(shown(e)).toEqual([]);
  });
});
