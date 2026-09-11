import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { EditorTable } from "@/components/extensions/table";
import { TableBubble } from "@/components/table-bubble";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Qua EditorContent thật và render lại ở mọi transaction như SimpleEditor, vì
 * lỗi đáng sợ nhất ở đây là vòng lặp "Maximum update depth exceeded" khi một
 * prop của BubbleMenu đổi identity mỗi lần render. Vòng lặp đó chỉ lộ ra khi
 * có render lại.
 */
function Harness({ onReady }: { onReady: (editor: Editor) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, EditorTable],
    content:
      "<p>Trước</p><table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>",
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
  });
  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);
  return (
    <TooltipProvider>
      <EditorContent editor={editor} />
      {editor && <TableBubble editor={editor} />}
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

/** Đặt con trỏ ngay sau đoạn chữ `text`. */
const caretAfter = (editor: Editor, text: string) =>
  act(async () => {
    let at = -1;
    editor.state.doc.descendants((node, pos) => {
      if (at === -1 && node.isText && node.text === text) at = pos + text.length;
      return at === -1;
    });
    editor.chain().focus().setTextSelection(at).run();
  });

const addRowBelow = () =>
  document.querySelector<HTMLButtonElement>('[aria-label="Thêm hàng phía dưới"]');

/** Phần tử BubbleMenu tự ẩn hiện bằng `visibility` trên chính nó. */
function shown(): boolean {
  let el: HTMLElement | null = addRowBelow();
  while (el && !el.style.visibility) el = el.parentElement;
  return el?.style.visibility === "visible";
}

describe("TableBubble", () => {
  it("hiện khi con trỏ nằm trong bảng, ẩn khi ra ngoài", async () => {
    const editor = await open();
    await caretAfter(editor, "1");
    await waitFor(() => expect(shown()).toBe(true));
    await caretAfter(editor, "Trước");
    await waitFor(() => expect(shown()).toBe(false));
  });

  it("bấm Thêm hàng phía dưới thì bảng có thêm một hàng", async () => {
    const editor = await open();
    await caretAfter(editor, "1");
    await waitFor(() => expect(shown()).toBe(true));
    await act(async () => {
      fireEvent.click(addRowBelow()!);
    });
    expect(editor.getHTML().match(/<tr>/g)).toHaveLength(3);
  });
});
