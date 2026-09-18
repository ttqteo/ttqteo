import { Editor } from "@tiptap/react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { bodyToDoc, docToBody } from "@/lib/note-doc";
import { LinkChip } from "./link-chip";
import { NotePlainText } from "./note-plain-text";

const URL = "https://www.omelet.tech/deepseek-v4?fbclid=IwY2";

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

function open(body: string) {
  editor = new Editor({
    extensions: [StarterKit, LinkChip, NotePlainText.configure({ maxLength: 40 })],
    content: bodyToDoc(body),
  });
  return editor;
}

/** Position of the first chip in the document. */
function chipAt(e: Editor): number {
  let found = -1;
  e.state.doc.descendants((node, pos) => {
    if (found < 0 && node.type.name === "linkChip") found = pos;
  });
  return found;
}

function copy(e: Editor) {
  return e.view.serializeForClipboard(e.state.selection.content());
}

describe("NotePlainText clipboard", () => {
  it("copies a selected chip as its full URL, and as a link for rich editors", () => {
    const e = open(`đọc ${URL}`);
    e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, chipAt(e))));
    const { text, dom } = copy(e);
    expect(text).toBe(URL);
    expect(dom.querySelector("a")?.getAttribute("href")).toBe(URL);
  });

  it("copies text around a chip with the URL written out", () => {
    const e = open(`đọc ${URL} nhé\ndòng hai`);
    e.view.dispatch(
      e.state.tr.setSelection(TextSelection.create(e.state.doc, 1, e.state.doc.content.size - 1)),
    );
    expect(copy(e).text).toBe(`đọc ${URL} nhé\ndòng hai`);
  });

  it("refuses an edit that takes the note past its limit, but not one that shortens it", () => {
    const e = open("x".repeat(38));
    e.commands.insertContentAt(e.state.doc.content.size - 1, { type: "text", text: "yyy" });
    expect(docToBody(e.getJSON())).toBe("x".repeat(38));
    e.commands.insertContentAt(e.state.doc.content.size - 1, { type: "text", text: "yy" });
    expect(docToBody(e.getJSON())).toBe(`${"x".repeat(38)}yy`);
  });
});

describe("NotePlainText Escape", () => {
  it("lets go of a selected chip, caret after it, and keeps the key from closing the panel", () => {
    const e = open(`đọc ${URL} nhé`);
    const at = chipAt(e);
    e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, at)));
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    const handled = e.view.someProp("handleKeyDown", (f) => f(e.view, event));
    expect(handled).toBe(true);
    expect(e.state.selection.empty).toBe(true);
    expect(e.state.selection.from).toBe(at + 1);
  });

  it("leaves Escape alone when no chip is selected", () => {
    const e = open("đọc");
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    expect(e.view.someProp("handleKeyDown", (f) => f(e.view, event))).toBeFalsy();
  });
});
