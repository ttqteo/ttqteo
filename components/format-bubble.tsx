"use client";

import { PluginKey } from "@tiptap/pm/state";
import type { ChainedCommands, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Code,
  Italic,
  Link2,
  Strikethrough,
  UnderlineIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BubbleButton } from "@/components/bubble-button";
import { formatBubbleShouldShow } from "@/components/editor-bubbles";

/**
 * Trên vùng chọn, trừ máy cảm ứng: ở đó menu copy/dán của hệ điều hành đã
 * chiếm phía trên. Tính một lần ở cấp module, vì BubbleMenu dispatch lại mỗi
 * khi `options` đổi identity (xem editor-bubbles.ts).
 */
const FORMAT_BUBBLE_OPTIONS = {
  placement:
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
      ? "bottom"
      : "top",
  offset: 8,
} as const;

/** Khoá riêng, để tự ẩn bubble bằng meta `"hide"` của plugin. */
const FORMAT_BUBBLE_KEY = new PluginKey("formatBubble");

type MarkButton = {
  name: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  toggle: (chain: ChainedCommands) => ChainedCommands;
};

const MARK_BUTTONS: MarkButton[] = [
  {
    name: "bold",
    label: "Đậm",
    shortcut: "Ctrl+B",
    icon: Bold,
    toggle: (chain) => chain.toggleBold(),
  },
  {
    name: "italic",
    label: "Nghiêng",
    shortcut: "Ctrl+I",
    icon: Italic,
    toggle: (chain) => chain.toggleItalic(),
  },
  {
    name: "underline",
    label: "Gạch dưới",
    shortcut: "Ctrl+U",
    icon: UnderlineIcon,
    toggle: (chain) => chain.toggleUnderline(),
  },
  {
    name: "strike",
    label: "Gạch ngang",
    shortcut: "Ctrl+Shift+S",
    icon: Strikethrough,
    toggle: (chain) => chain.toggleStrike(),
  },
  {
    name: "code",
    label: "Code",
    shortcut: "Ctrl+E",
    icon: Code,
    toggle: (chain) => chain.toggleCode(),
  },
];

/**
 * Định dạng chữ đang bôi đen, thay cho hàng nút B, I, U, S, code, link từng
 * nằm cố định trên thanh công cụ.
 *
 * Nút Link đổi bubble thành một ô nhập địa chỉ ngay tại chỗ, thay cho
 * `window.prompt` trước đây. Chữ đã là link thì nút sáng, bấm là bỏ link. Sửa
 * một link có sẵn vẫn là việc của LinkBubble, mở khi đặt con trỏ vào link.
 */
export function FormatBubble({ editor }: { editor: Editor }) {
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState("");
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  // Một vùng chọn mới thì ô link đang mở không còn thuộc về nó nữa.
  useEffect(() => {
    const reset = () => setLinking(false);
    editor.on("selectionUpdate", reset);
    return () => {
      editor.off("selectionUpdate", reset);
    };
  }, [editor]);

  const run = (command: (chain: ChainedCommands) => ChainedCommands) =>
    command(editor.chain().focus()).run();

  const onLinkButton = () => {
    if (editor.isActive("link")) {
      run((chain) => chain.extendMarkRange("link").unsetLink());
      return;
    }
    setHref("");
    setLinking(true);
  };

  const finishLink = (apply: boolean) => {
    const url = href.trim();
    setLinking(false);
    if (apply && url) {
      run((chain) => chain.extendMarkRange("link").setLink({ href: url }));
    } else {
      editor.commands.focus();
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={FORMAT_BUBBLE_KEY}
      shouldShow={formatBubbleShouldShow}
      options={FORMAT_BUBBLE_OPTIONS}
      // Trên thanh công cụ dính của editor (z-30), dưới header trang soạn.
      className="z-40"
    >
      <div
        ref={bubbleRef}
        className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
      >
        {linking ? (
          <input
            autoFocus
            type="url"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                finishLink(true);
              } else if (event.key === "Escape") {
                event.preventDefault();
                finishLink(false);
              }
            }}
            onBlur={(event) => {
              // Focus sang chỗ khác hẳn, như ô tiêu đề: ẩn luôn, đừng để bubble
              // lơ lửng tới transaction kế tiếp của editor.
              const next = event.relatedTarget as Node | null;
              if (next && (bubbleRef.current?.contains(next) || editor.view.dom.contains(next))) {
                return;
              }
              setLinking(false);
              editor.view.dispatch(editor.state.tr.setMeta(FORMAT_BUBBLE_KEY, "hide"));
            }}
            placeholder="Dán link rồi Enter"
            aria-label="Địa chỉ link"
            className="h-7 w-64 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <div
            className="flex items-center gap-0.5"
            // Giữ focus và vùng chọn trong editor khi bấm nút.
            onMouseDown={(event) => event.preventDefault()}
          >
            {MARK_BUTTONS.map((mark) => {
              const Icon = mark.icon;
              return (
                <BubbleButton
                  key={mark.name}
                  label={mark.label}
                  shortcut={mark.shortcut}
                  active={editor.isActive(mark.name)}
                  onClick={() => run(mark.toggle)}
                >
                  <Icon className="h-3.5 w-3.5" />
                </BubbleButton>
              );
            })}
            <BubbleButton label="Link" active={editor.isActive("link")} onClick={onLinkButton}>
              <Link2 className="h-3.5 w-3.5" />
            </BubbleButton>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
