import { generateHTML, generateJSON } from "@tiptap/html";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { bodyToDoc, docToBody } from "@/lib/note-doc";
import { LinkChip } from "./link-chip";

const extensions = [StarterKit, LinkChip];
const URL = "https://www.omelet.tech/deepseek-v4-1-trieu-token/?fbclid=IwY2xjawR";

const doc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "đọc " },
        { type: "linkChip", attrs: { url: URL } },
      ],
    },
  ],
};

describe("LinkChip", () => {
  it("shows the short label and keeps the full URL for the hover title", () => {
    const html = generateHTML(doc, extensions);
    expect(html).toContain(">omelet.tech/deepseek-v4-1-trieu-token<");
    expect(html).toContain(`title="${URL}"`);
    expect(html).toContain(`data-link-chip="${URL}"`);
  });

  it("reads itself back from its own markup", () => {
    const html = generateHTML(doc, extensions);
    expect(generateJSON(html, extensions)).toEqual(doc);
  });
});

describe("LinkChip while typing", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const open = (body: string) => {
    editor = new Editor({ extensions: [StarterKit, LinkChip], content: bodyToDoc(body) });
    editor.commands.focus("end");
    return editor;
  };
  const chips = (e: Editor) => {
    const urls: string[] = [];
    e.state.doc.descendants((node) => {
      if (node.type.name === "linkChip") urls.push(node.attrs.url as string);
    });
    return urls;
  };

  it("leaves a URL as text while the caret is at its end", () => {
    const e = open("đọc ");
    e.commands.insertContent({ type: "text", text: "https://a.com/x." });
    expect(chips(e)).toEqual([]);
    expect(docToBody(e.getJSON())).toBe("đọc https://a.com/x.");
  });

  it("makes it a chip once the caret moves on, punctuation kept as text", () => {
    const e = open("đọc ");
    e.commands.insertContent({ type: "text", text: "https://a.com/x." });
    e.commands.insertContent({ type: "text", text: " " });
    expect(chips(e)).toEqual(["https://a.com/x"]);
    expect(docToBody(e.getJSON())).toBe("đọc https://a.com/x. ");
  });

  it("opens a note with its URLs already as chips", () => {
    const e = open("xem https://a.com/x\nhttps://b.com");
    expect(chips(e)).toEqual(["https://a.com/x", "https://b.com"]);
  });
});
