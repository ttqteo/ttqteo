"use client";

// Via `@tiptap/react`, which re-exports all of `@tiptap/core`: core is only a
// transitive dependency here and is not resolvable as a bare specifier.
import { Node, mergeAttributes } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { EyeOff } from "lucide-react";
import { PRIVATE_NOTE_ATTR } from "@/lib/private-note";

// Cùng lý do với callout.tsx: augment qua `@tiptap/react` để
// `togglePrivateNote` có kiểu thật thay vì phải `as never`.
declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    privateNote: {
      togglePrivateNote: () => ReturnType;
    };
  }
}

function PrivateNoteView() {
  return (
    <NodeViewWrapper as="aside" className="private-note">
      {/* Ngoài luồng editable: không gõ được vào nhãn, và click vào nhãn không
          kéo selection đi đâu. */}
      <div
        className="private-note-label"
        contentEditable={false}
        suppressContentEditableWarning
      >
        <EyeOff className="h-3 w-3" aria-hidden />
        ghi chú riêng · ẩn khi đăng
      </div>
      <NodeViewContent className="private-note-body" />
    </NodeViewWrapper>
  );
}

/**
 * Ghi chú của người viết cho chính mình, nằm ngay giữa bài: "đọc chưa hiểu,
 * viết lại cho dễ hiểu", "kiểm lại số liệu". Hiện trong editor, bị cắt khỏi mọi
 * đường đọc công khai bởi `stripPrivateNotes` (lib/private-note.ts).
 *
 * Lưu xuống là `<aside data-private-note>`. Không node nào khác trong editor
 * phát ra `aside`, nên bộ cắt chỉ phải đếm một loại thẻ. `data-private-note` là
 * hợp đồng định dạng, cùng luật với callout và link card. Đổi thẻ hay attribute
 * thì phải đổi cả `stripPrivateNotes`; quên thì private-note.test.ts đỏ.
 *
 * `content: "block+"` như callout: một ghi chú nhắc việc thường có vài dòng,
 * đôi khi kèm gạch đầu dòng hay một đoạn code nháp.
 */
export const PrivateNote = Node.create({
  name: "privateNote",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: `aside[${PRIVATE_NOTE_ATTR}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { class: "private-note", [PRIVATE_NOTE_ATTR]: "" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PrivateNoteView);
  },

  addCommands() {
    return {
      togglePrivateNote:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },

  addKeyboardShortcuts() {
    // Cùng họ với Mod-Alt-c của callout.
    return { "Mod-Alt-n": () => this.editor.commands.togglePrivateNote() };
  },
});
