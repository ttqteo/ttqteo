import { act, render, waitFor } from "@testing-library/react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { Callout } from "@/components/extensions/callout";
import { CodeBlockWithLanguage } from "@/components/extensions/code-block-language";
import { PrivateNote } from "@/components/extensions/private-note";
import { SlashCommand } from "@/components/extensions/slash-command";

/**
 * The menu is a ReactRenderer, and a ReactRenderer only renders once an
 * EditorContent has mounted for its editor. So this goes through a real
 * EditorContent rather than a bare `new Editor()`.
 */
function Harness({ content, onReady }: { content: string; onReady: (editor: Editor) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithLanguage,
      Callout,
      PrivateNote,
      SlashCommand,
    ],
    content,
    immediatelyRender: false,
  });
  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);
  return <EditorContent editor={editor} />;
}

async function open(content: string): Promise<Editor> {
  const ready: { editor?: Editor } = {};
  const { container } = render(
    <Harness content={content} onReady={(editor) => (ready.editor = editor)} />,
  );
  await waitFor(() => {
    expect(ready.editor).toBeDefined();
    expect(container.querySelector(".ProseMirror")).not.toBeNull();
  });
  return ready.editor!;
}

const type = (editor: Editor, text: string) =>
  act(async () => {
    editor.chain().focus("end").insertContent(text).run();
  });

const press = (editor: Editor, key: string) =>
  act(async () => {
    editor.view.dom.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });

const menu = () => document.body.querySelector('[role="listbox"]');
const options = () =>
  Array.from(document.body.querySelectorAll('[role="option"]')).map((o) => o.textContent);

describe("slash menu", () => {
  it("gõ / ở dòng trống thì hiện bốn khối", async () => {
    const editor = await open("<p></p>");
    await type(editor, "/");
    await waitFor(() =>
      expect(options()).toEqual(["Callout", "Khối code", "Ghi chú riêng", "Trích dẫn"]),
    );
  });

  it("gõ tiếp thì lọc, Enter chọn mục đang sáng", async () => {
    const editor = await open("<p></p>");
    await type(editor, "/trich");
    await waitFor(() => expect(options()).toEqual(["Trích dẫn"]));
    await press(editor, "Enter");
    expect(editor.getHTML()).toContain("<blockquote><p></p></blockquote>");
    await waitFor(() => expect(menu()).toBeNull());
  });

  it("mũi tên xuống rồi Enter chọn mục thứ hai", async () => {
    const editor = await open("<p></p>");
    await type(editor, "/");
    await waitFor(() => expect(options()).toHaveLength(4));
    await press(editor, "ArrowDown");
    await press(editor, "Enter");
    expect(editor.getHTML()).toMatch(/<pre[^>]*><code[^>]*><\/code><\/pre>/);
  });

  it("Escape đóng menu và giữ nguyên chữ đã gõ", async () => {
    const editor = await open("<p></p>");
    await type(editor, "/cal");
    await waitFor(() => expect(options()).toEqual(["Callout"]));
    await press(editor, "Escape");
    await waitFor(() => expect(menu()).toBeNull());
    expect(editor.getHTML()).toBe("<p>/cal</p>");
  });

  it("không mở trong khối code", async () => {
    const editor = await open("<pre><code>x</code></pre>");
    await type(editor, " /");
    // Cho plugin một nhịp để kịp mở nếu nó định mở.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(menu()).toBeNull();
  });
});
