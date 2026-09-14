import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { CodeIndent, lineStartsIn } from "./code-indent";
import { ListNesting } from "./list-nesting";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function open(content: string): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, ListNesting, CodeIndent],
    content,
  });
  return editor;
}

/** Vị trí đầu chữ của khối code đầu tiên. */
function codeStart(e: Editor): number {
  let pos = -1;
  e.state.doc.descendants((node, at) => {
    if (pos === -1 && node.type.name === "codeBlock") pos = at + 1;
  });
  if (pos === -1) throw new Error("no code block");
  return pos;
}

function select(e: Editor, from: number, to = from): void {
  const start = codeStart(e);
  e.commands.setTextSelection({ from: start + from, to: start + to });
}

function press(e: Editor, key: string, shiftKey = false): boolean {
  return (
    e.view.someProp("handleKeyDown", (f) =>
      f(e.view, new KeyboardEvent("keydown", { key, shiftKey })),
    ) ?? false
  );
}

function code(e: Editor): string {
  let out = "";
  e.state.doc.descendants((node) => {
    if (!out && node.type.name === "codeBlock") out = node.textContent;
  });
  return out;
}

describe("lineStartsIn", () => {
  it("con trỏ: chỉ dòng đang đứng", () => {
    expect(lineStartsIn("ab\ncd\nef", 4, 4)).toEqual([3]);
  });

  it("vùng chọn qua nhiều dòng", () => {
    expect(lineStartsIn("ab\ncd\nef", 1, 7)).toEqual([0, 3, 6]);
  });

  it("dừng ngay đầu một dòng thì dòng đó không tính", () => {
    expect(lineStartsIn("ab\ncd\nef", 0, 6)).toEqual([0, 3]);
  });
});

describe("Tab", () => {
  it("chèn hai dấu cách ở con trỏ", () => {
    const e = open("<pre><code>foo</code></pre>");
    select(e, 0);
    expect(press(e, "Tab")).toBe(true);
    expect(code(e)).toBe("  foo");
    expect(e.state.selection.from).toBe(codeStart(e) + 2);
  });

  it("thụt mọi dòng vùng chọn chạm tới, từ đầu dòng", () => {
    const e = open("<pre><code>a1\nb2\nc3</code></pre>");
    // Từ giữa dòng đầu tới giữa dòng hai.
    select(e, 1, 4);
    press(e, "Tab");
    expect(code(e)).toBe("  a1\n  b2\nc3");
  });

  it("khối code trong một mục list: thụt code, không thụt mục list", () => {
    const e = open(
      "<ul><li><p>one</p></li><li><p>two</p><pre><code>x</code></pre></li></ul>",
    );
    select(e, 0);
    press(e, "Tab");
    expect(code(e)).toBe("  x");
    // Vẫn là hai mục ngang hàng, không mục nào bị lồng vào mục trên.
    expect(e.state.doc.child(0).childCount).toBe(2);
  });

  it("ngoài khối code thì không nhận", () => {
    const e = open("<p>hello</p>");
    e.commands.setTextSelection(2);
    press(e, "Tab");
    expect(e.getHTML()).toBe("<p>hello</p>");
  });
});

describe("Shift+Tab", () => {
  it("lùi dòng đang đứng tối đa hai dấu cách mỗi lần", () => {
    const e = open("<pre><code>    x</code></pre>");
    select(e, 4);
    press(e, "Tab", true);
    expect(code(e)).toBe("  x");
    press(e, "Tab", true);
    expect(code(e)).toBe("x");
  });

  it("hết chỗ lùi vẫn giữ phím, không cho tiêu điểm nhảy ra ngoài", () => {
    const e = open("<pre><code>x</code></pre>");
    select(e, 1);
    expect(press(e, "Tab", true)).toBe(true);
    expect(code(e)).toBe("x");
  });

  it("lùi mọi dòng trong vùng chọn, dòng ít thụt thì lùi ít", () => {
    const e = open("<pre><code>  a\n b\nc</code></pre>");
    select(e, 0, 8);
    press(e, "Tab", true);
    expect(code(e)).toBe("a\nb\nc");
  });

  it("một dấu tab ở đầu dòng cũng lùi được", () => {
    const e = open("<pre><code>\tx</code></pre>");
    select(e, 2);
    press(e, "Tab", true);
    expect(code(e)).toBe("x");
  });
});
