"use client";

import { Extension, ReactRenderer, type ChainedCommands, type Editor, type Range } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { Code2, Lightbulb, Quote, StickyNote, Table2, type LucideIcon } from "lucide-react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";
import { CODE_LANGUAGES } from "./code-block-language";

export type SlashItem = {
  /** `code:<ngôn ngữ>` là các mục "/code" + tên ngôn ngữ, xem codeLanguageItems. */
  id: "callout" | "code" | "note" | "quote" | "table" | `code:${string}`;
  label: string;
  /** Tên khác để gõ tìm, ngoài `label`. So khớp bỏ dấu, bỏ khoảng trắng. */
  keywords: string[];
  icon: LucideIcon;
  /** Cùng lệnh với mục tương ứng trong menu "Chèn" của thanh công cụ. */
  apply: (chain: ChainedCommands) => ChainedCommands;
};

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "callout",
    label: "Callout",
    keywords: ["nổi bật"],
    icon: Lightbulb,
    apply: (chain) => chain.toggleCallout("note"),
  },
  {
    id: "code",
    label: "Khối code",
    keywords: ["code", "codeblock"],
    icon: Code2,
    apply: (chain) => chain.toggleCodeBlock(),
  },
  {
    id: "note",
    label: "Ghi chú riêng",
    keywords: ["note", "private"],
    icon: StickyNote,
    apply: (chain) => chain.togglePrivateNote(),
  },
  {
    id: "quote",
    label: "Trích dẫn",
    keywords: ["quote", "blockquote"],
    icon: Quote,
    apply: (chain) => chain.toggleBlockquote(),
  },
  {
    id: "table",
    label: "Table",
    keywords: ["bảng"],
    icon: Table2,
    apply: (chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
  },
];

/**
 * Bỏ dấu và khoảng trắng: query của suggestion không chứa được dấu cách, và
 * gõ tiếng Việt không dấu cho nhanh là chuyện thường, nên "ghichu" phải tìm ra
 * "Ghi chú riêng".
 */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/\s+/g, "");
}

/**
 * Tên tắt gõ được sau "/code", ngoài tên đầy đủ. Là đuôi file quen tay, nên
 * "/codejs" ra javascript và "/codeyml" ra yaml.
 */
const LANGUAGE_ALIASES: Partial<Record<(typeof CODE_LANGUAGES)[number], string[]>> = {
  bash: ["sh", "shell"],
  cpp: ["c++"],
  csharp: ["c#"],
  docker: ["dockerfile"],
  javascript: ["js"],
  kotlin: ["kt"],
  markdown: ["md"],
  python: ["py"],
  ruby: ["rb"],
  rust: ["rs"],
  typescript: ["ts"],
  yaml: ["yml"],
};

const CODE_PREFIX = "code";

/**
 * "/code" rồi tên ngôn ngữ: mỗi ngôn ngữ khớp thành một mục, tạo khối code đã
 * chọn sẵn ngôn ngữ đó, nên "/codej" gợi ý java, javascript, json. "/code"
 * trần thì không liệt kê: hai mươi mấy ngôn ngữ sẽ đẩy mục "Khối code" đi mất.
 */
function codeLanguageItems(needle: string): SlashItem[] {
  if (!needle.startsWith(CODE_PREFIX)) return [];
  const typed = needle.slice(CODE_PREFIX.length);
  if (!typed) return [];
  return CODE_LANGUAGES.filter((language) =>
    [language, ...(LANGUAGE_ALIASES[language] ?? [])].some((name) =>
      name.startsWith(typed),
    ),
  ).map((language) => ({
    id: `code:${language}`,
    label: language,
    keywords: [],
    icon: Code2,
    apply: (chain) => chain.toggleCodeBlock({ language }),
  }));
}

export function filterSlashItems(query: string): SlashItem[] {
  const needle = fold(query);
  return [
    ...SLASH_ITEMS.filter((item) =>
      [item.label, ...item.keywords].some((name) => fold(name).includes(needle)),
    ),
    ...codeLanguageItems(needle),
  ];
}

/** Xoá "/query" vừa gõ rồi chạy lệnh trong cùng một chain, nên một lần undo là về như cũ. */
export function applySlashItem(editor: Editor, range: Range, item: SlashItem): void {
  item.apply(editor.chain().focus().deleteRange(range)).run();
}

type SlashMenuProps = {
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

type SlashMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const [active, setActive] = useState(0);
  // Mỗi lần gõ thêm là một danh sách mới, và chỉ số cũ có thể trỏ ra ngoài nó.
  // Đặt lại ngay trong render, như bảng bài viết làm với selection, để không
  // có khung hình nào sáng sai mục.
  const [lastItems, setLastItems] = useState(items);
  if (items !== lastItems) {
    setLastItems(items);
    setActive(0);
  }

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: (event) => {
        // Không còn mục nào thì trả phím cho editor: Enter phải xuống dòng như thường.
        if (items.length === 0) return false;
        if (event.key === "ArrowDown") {
          setActive((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setActive((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          command(items[active]);
          return true;
        }
        return false;
      },
    }),
    [items, active, command],
  );

  // "/" giữa câu hay trong một đường dẫn cũng mở menu. Không khớp gì thì đó là
  // chữ thật, và một hộp "không có kết quả" chỉ đứng chắn chỗ.
  if (items.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Chèn khối"
      className="w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === active}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
              index === active && "bg-accent text-accent-foreground",
            )}
            onMouseEnter={() => setActive(index)}
            // Giữ focus trong editor, nếu không chữ "/" mất selection trước khi lệnh chạy.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command(item)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
});

const SlashCommandPluginKey = new PluginKey("slashCommand");

/**
 * Gõ "/" để chèn nhanh các khối đang nằm sau nút "+" của thanh công cụ.
 *
 * Mở ở đầu dòng hoặc sau dấu cách (mặc định của suggestion), nên "và/hoặc" hay
 * một URL không bật menu. Không mở trong khối code: ở đó "/" là chữ.
 */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: SlashCommandPluginKey,
        char: "/",
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => applySlashItem(editor, range, props),
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        render: () => {
          let menu: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null;
          let unmount: (() => void) | null = null;

          return {
            onStart: (props) => {
              menu = new ReactRenderer(SlashMenu, {
                editor: props.editor,
                props: { items: props.items, command: props.command },
                // Trên thanh công cụ admin (z-[60]) và header dính của trang soạn.
                className: "z-[70]",
              });
              unmount = props.mount(menu.element);
            },
            onUpdate: (props) => {
              menu?.updateProps({ items: props.items, command: props.command });
            },
            onKeyDown: ({ event }) => menu?.ref?.onKeyDown(event) ?? false,
            onExit: () => {
              unmount?.();
              menu?.destroy();
              menu = null;
              unmount = null;
            },
          };
        },
      }),
    ];
  },
});
