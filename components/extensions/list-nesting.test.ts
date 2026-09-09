import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { ListNesting, nestListIntoPreviousList } from "./list-nesting";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function open(content: string): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, ListNesting],
    content,
  });
  return editor;
}

/**
 * tiptap keeps an empty paragraph after a trailing list so there is somewhere
 * to escape to. It is editor affordance, not content, so it is dropped here.
 */
function html(instance: Editor): string {
  return instance.getHTML().replace(/<p><\/p>$/, "");
}

/** Puts the caret just inside the given text node. */
function caretAt(instance: Editor, text: string): void {
  let pos = -1;
  instance.state.doc.descendants((node, at) => {
    if (pos === -1 && node.isText && node.text === text) pos = at + 1;
  });
  if (pos === -1) throw new Error(`no text node ${JSON.stringify(text)}`);
  instance.commands.setTextSelection(pos);
}

describe("nestListIntoPreviousList", () => {
  it("moves a bullet list into the ordered list above it", () => {
    const e = open(
      "<ol><li><p>Java là gì?</p></li></ol><ul><li><p>Ra đời 1995</p></li><li><p>Hướng đối tượng</p></li></ul>",
    );
    caretAt(e, "Ra đời 1995");

    expect(nestListIntoPreviousList(e)).toBe(true);
    expect(html(e)).toBe(
      "<ol><li><p>Java là gì?</p><ul><li><p>Ra đời 1995</p></li><li><p>Hướng đối tượng</p></li></ul></li></ol>",
    );
  });

  it("takes the following items along rather than orphaning them", () => {
    const e = open(
      "<ul><li><p>A</p></li></ul><ol><li><p>B</p></li><li><p>C</p></li></ol>",
    );
    caretAt(e, "B");
    nestListIntoPreviousList(e);
    // Both B and C end up nested; C is not left behind at the old level.
    expect(html(e)).toBe(
      "<ul><li><p>A</p><ol><li><p>B</p></li><li><p>C</p></li></ol></li></ul>",
    );
  });

  it("nests into the last item of the previous list, not the first", () => {
    const e = open(
      "<ul><li><p>A</p></li><li><p>B</p></li></ul><ol><li><p>C</p></li></ol>",
    );
    caretAt(e, "C");
    nestListIntoPreviousList(e);
    expect(html(e)).toBe(
      "<ul><li><p>A</p></li><li><p>B</p><ol><li><p>C</p></li></ol></li></ul>",
    );
  });

  it("keeps the caret in the text it was in", () => {
    const e = open("<ul><li><p>A</p></li></ul><ol><li><p>BCD</p></li></ol>");
    let before = -1;
    e.state.doc.descendants((node, at) => {
      if (node.isText && node.text === "BCD") before = at + 2;
    });
    e.commands.setTextSelection(before);

    nestListIntoPreviousList(e);
    const $pos = e.state.doc.resolve(e.state.selection.from);
    expect($pos.parent.textContent).toBe("BCD");
  });

  describe("declines", () => {
    it("when nothing precedes the list", () => {
      const e = open("<ul><li><p>A</p></li></ul>");
      caretAt(e, "A");
      expect(nestListIntoPreviousList(e)).toBe(false);
    });

    it("when the previous sibling is not a list", () => {
      const e = open("<p>intro</p><ul><li><p>A</p></li></ul>");
      caretAt(e, "A");
      expect(nestListIntoPreviousList(e)).toBe(false);
      expect(html(e)).toBe("<p>intro</p><ul><li><p>A</p></li></ul>");
    });

    it("on a later item, which sinkListItem already handles", () => {
      const e = open(
        "<ul><li><p>A</p></li></ul><ol><li><p>B</p></li><li><p>C</p></li></ol>",
      );
      caretAt(e, "C");
      expect(nestListIntoPreviousList(e)).toBe(false);
    });

    it("outside a list entirely", () => {
      const e = open("<p>just a paragraph</p>");
      caretAt(e, "just a paragraph");
      expect(nestListIntoPreviousList(e)).toBe(false);
    });
  });
});
