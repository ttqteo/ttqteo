"use client";

// Via `@tiptap/react`, which re-exports all of `@tiptap/core`: core is only a
// transitive dependency here and is not resolvable as a bare specifier.
import { Node, mergeAttributes } from "@tiptap/react";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

/**
 * Trùng với `type` của components/markdown/note.tsx để bài MDX và bài soạn
 * bằng editor không nói hai thứ tiếng. `note` đứng đầu vì nó là mặc định.
 */
export const CALLOUT_VARIANTS = ["note", "tip", "warning", "danger"] as const;

export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

const DEFAULT_VARIANT: CalloutVariant = "note";

/** Nhãn hiện trong picker của editor. Không lọt xuống HTML đã lưu. */
export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  note: "ghi chú",
  tip: "mẹo",
  warning: "lưu ý",
  danger: "cảnh báo",
};

// Nới `Commands` để `toggleCallout` có kiểu thật thay vì phải `as never`.
// Augment qua `@tiptap/react` chứ không phải `@tiptap/core`: core chỉ là phụ
// thuộc bắc cầu, TypeScript không tìm ra tên module đó (TS2664). React
// re-export nguyên `Commands` của core nên khai báo ở đây vẫn merge đúng chỗ.
declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (variant?: CalloutVariant) => ReturnType;
    };
  }
}

function toVariant(value: string | null): CalloutVariant {
  // Hạ về mặc định thay vì giữ nguyên giá trị lạ: khác ngôn ngữ của code block
  // (chỉ là tên class, giữ nguyên là an toàn), kiểu callout ứng với một class
  // có style thật, và một giá trị không có style ra khối trông như hỏng.
  return (CALLOUT_VARIANTS as readonly string[]).includes(value ?? "")
    ? (value as CalloutVariant)
    : DEFAULT_VARIANT;
}

function CalloutView({ node, updateAttributes, editor }: NodeViewProps) {
  const variant = toVariant(node.attrs.variant as string | null);

  return (
    <NodeViewWrapper className={`callout callout-${variant}`} data-callout={variant}>
      {/* Ngoài luồng editable, cùng lý do với picker của code block: click vào
          select mà không có cái này thì selection nhảy vào trong khối. */}
      <select
        contentEditable={false}
        suppressContentEditableWarning
        className="callout-picker"
        value={variant}
        disabled={!editor.isEditable}
        aria-label="Kiểu callout"
        onChange={(event) => updateAttributes({ variant: event.target.value })}
      >
        {CALLOUT_VARIANTS.map((name) => (
          <option key={name} value={name}>
            {CALLOUT_LABELS[name]}
          </option>
        ))}
      </select>
      <NodeViewContent className="callout-body" />
    </NodeViewWrapper>
  );
}

/**
 * Một khối được làm nổi bật, kiểu callout của Notion.
 *
 * `content: "block+"` chứ không phải một đoạn văn: một tóm tắt thường có hơn
 * một đoạn, và đôi khi có gạch đầu dòng.
 *
 * Không như link card, khối này không cần JavaScript nào trên đường đọc. Cái
 * `renderHTML` phát ra là cái người đọc nhận, và toàn bộ diện mạo nằm trong
 * `globals.css` dưới các class ngữ nghĩa ở đây. Tailwind chỉ quét `.ts`/`.tsx`
 * nên utility nằm trong một chuỗi dưới database sẽ không được sinh CSS.
 *
 * `variant` đọc lại từ `data-callout`, không từ class: class là chuyện trình
 * bày và có thể đổi tên, data attribute mới là hợp đồng định dạng.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: DEFAULT_VARIANT,
        parseHTML: (element: HTMLElement) => toVariant(element.getAttribute("data-callout")),
        // Tự tay dựng trong renderHTML, nếu không tiptap phát thêm một
        // `variant="note"` lạc lõng ra HTML.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = toVariant(node.attrs.variant as string | null);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: `callout callout-${variant}`,
        "data-callout": variant,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      toggleCallout:
        (variant: CalloutVariant = DEFAULT_VARIANT) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { variant }),
    };
  },

  addKeyboardShortcuts() {
    // Alt chứ không phải Shift: Mod-Shift-c đã là chuyện của code block trong
    // nhiều editor và người dùng hay gõ nhầm sang.
    return { "Mod-Alt-c": () => this.editor.commands.toggleCallout() };
  },
});
