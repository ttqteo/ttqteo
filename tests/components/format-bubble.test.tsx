import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { FormatBubble } from "@/components/format-bubble";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Như SimpleEditor: render lại ở mọi transaction, nơi vòng lặp render lộ ra. */
function Harness({ onReady }: { onReady: (editor: Editor) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Java là ngôn ngữ</p>",
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
  });
  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);
  return (
    <TooltipProvider>
      <EditorContent editor={editor} />
      {editor && <FormatBubble editor={editor} />}
    </TooltipProvider>
  );
}

async function open(): Promise<Editor> {
  const ready: { editor?: Editor } = {};
  const { container } = render(<Harness onReady={(editor) => (ready.editor = editor)} />);
  await waitFor(() => {
    expect(ready.editor).toBeDefined();
    expect(container.querySelector(".ProseMirror")).not.toBeNull();
  });
  return ready.editor!;
}

const select = (editor: Editor, text: string) =>
  act(async () => {
    let from = -1;
    editor.state.doc.descendants((node, pos) => {
      if (from === -1 && node.isText && node.text!.includes(text)) {
        from = pos + node.text!.indexOf(text);
      }
      return from === -1;
    });
    editor.chain().focus().setTextSelection({ from, to: from + text.length }).run();
  });

const button = (label: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

const linkInput = () =>
  document.querySelector<HTMLInputElement>('input[aria-label="Địa chỉ link"]');

/** Phần tử BubbleMenu tự ẩn hiện bằng `visibility` trên chính nó. */
function shown(): boolean {
  let el: HTMLElement | null = button("Đậm") ?? linkInput();
  while (el && !el.style.visibility) el = el.parentElement;
  return el?.style.visibility === "visible";
}

describe("FormatBubble", () => {
  it("hiện khi bôi đen, bấm Đậm thì chữ đang chọn thành đậm", async () => {
    const editor = await open();
    await select(editor, "Java");
    await waitFor(() => expect(shown()).toBe(true));
    await act(async () => {
      fireEvent.click(button("Đậm")!);
    });
    expect(editor.getHTML()).toContain("<strong>Java</strong>");
  });

  it("bấm Link, nhập địa chỉ rồi Enter thì chữ đang chọn thành link", async () => {
    const editor = await open();
    await select(editor, "Java");
    await waitFor(() => expect(shown()).toBe(true));
    await act(async () => {
      fireEvent.click(button("Link")!);
    });
    await waitFor(() => expect(linkInput()).not.toBeNull());
    await act(async () => {
      fireEvent.change(linkInput()!, { target: { value: "https://a.dev" } });
    });
    await act(async () => {
      fireEvent.keyDown(linkInput()!, { key: "Enter" });
    });
    expect(editor.getHTML()).toMatch(/<a [^>]*href="https:\/\/a\.dev"[^>]*>Java<\/a>/);
    // Xong thì bubble về lại hàng nút.
    await waitFor(() => expect(linkInput()).toBeNull());
  });

  it("Esc trong ô link thì bỏ, không tạo link", async () => {
    const editor = await open();
    await select(editor, "Java");
    await waitFor(() => expect(shown()).toBe(true));
    await act(async () => {
      fireEvent.click(button("Link")!);
    });
    await waitFor(() => expect(linkInput()).not.toBeNull());
    await act(async () => {
      fireEvent.change(linkInput()!, { target: { value: "https://a.dev" } });
    });
    await act(async () => {
      fireEvent.keyDown(linkInput()!, { key: "Escape" });
    });
    expect(editor.getHTML()).not.toContain("<a ");
    await waitFor(() => expect(linkInput()).toBeNull());
  });

  it("bấm Link trên chữ đã là link thì bỏ link", async () => {
    const editor = await open();
    await act(async () => {
      editor.commands.setContent('<p><a href="https://a.dev">Java</a> là ngôn ngữ</p>');
    });
    await select(editor, "Java");
    await waitFor(() => expect(shown()).toBe(true));
    await act(async () => {
      fireEvent.click(button("Link")!);
    });
    expect(editor.getHTML()).not.toContain("<a ");
  });
});
