"use client";

import { LinkChip } from "@/components/extensions/link-chip";
import { NotePlainText } from "@/components/extensions/note-plain-text";
import { MAX_NOTE_LENGTH } from "@/lib/admin-notes";
import { bodyToDoc, docToBody } from "@/lib/note-doc";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { CopyIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** The link menu's width, fixed so it can be kept inside the editor's box. */
const MENU_WIDTH = 288;

type LinkMenu = { url: string; from: number; to: number; top: number; left: number };

/** The chip the selection is on, or null. */
function selectedChip(editor: Editor): { url: string; from: number; to: number } | null {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "linkChip") return null;
  return { url: selection.node.attrs.url as string, from: selection.from, to: selection.to };
}

/**
 * The text of a quick note, edited as lines of plain text with each URL shown
 * as a short chip (components/extensions/link-chip.ts). Only paragraphs, text
 * and chips exist here: no bold, lists or headings, and no Markdown shortcuts
 * turning "- " into a list, so what is saved is exactly what was typed.
 * `onChange` gets the note's body as plain text, URLs written out in full.
 *
 * A click on a chip selects it and opens a small menu under it: the full URL
 * as a link to open it, Copy, and Edit, which turns the chip back into its
 * URL as text to change it.
 */
export function NoteBodyEditor({
  body,
  onChange,
}: {
  body: string;
  onChange: (body: string) => void;
}) {
  // The latest callback and body, for the editor's own onUpdate, which is set once.
  const change = useRef(onChange);
  const current = useRef(body);
  useEffect(() => {
    change.current = onChange;
    current.current = body;
  }, [onChange, body]);

  const box = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<LinkMenu | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: "end",
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
        // It would add an empty line to the end of every note.
        trailingNode: false,
      }),
      LinkChip,
      NotePlainText.configure({ maxLength: MAX_NOTE_LENGTH }),
      Placeholder.configure({ placeholder: "Ghi gì đó…" }),
    ],
    content: bodyToDoc(body),
    editorProps: {
      attributes: {
        "aria-label": "Nội dung note",
        "aria-multiline": "true",
        role: "textbox",
        class: "note-body-editor min-h-36 px-4 py-3 text-sm leading-relaxed outline-none",
      },
    },
    onUpdate({ editor: updated }) {
      // A URL turning into a chip, or a chip back into its URL, changes the
      // document but not the note: nothing to save.
      const next = docToBody(updated.getJSON());
      if (next === current.current) return;
      current.current = next;
      change.current(next);
    },
  });

  // A newer version from elsewhere (another tab, or the server keeping a
  // later save) replaces what is showing. Not an echo of this editor's own
  // typing: that body already matches.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (docToBody(editor.getJSON()) === body) return;
    editor.commands.setContent(bodyToDoc(body), { emitUpdate: false });
  }, [editor, body]);

  // The link menu follows the selection: open under a selected chip, shut
  // otherwise. Positioned inside this box rather than portalled, so it stays
  // clickable inside a modal dialog and scrolls with the panel.
  useEffect(() => {
    if (!editor) return;
    const place = () => {
      const chip = selectedChip(editor);
      const area = box.current;
      const dom = chip ? editor.view.nodeDOM(chip.from) : null;
      if (!chip || !area || !(dom instanceof HTMLElement)) {
        setMenu(null);
        return;
      }
      const at = dom.getBoundingClientRect();
      const within = area.getBoundingClientRect();
      const room = Math.max(0, within.width - MENU_WIDTH - 4);
      setMenu({
        ...chip,
        top: at.bottom - within.top + 4,
        left: Math.max(4, Math.min(at.left - within.left, room)),
      });
    };
    // Focus moving into the menu itself keeps it open.
    const onBlur = ({ event }: { event: FocusEvent }) => {
      if (menuRef.current?.contains(event.relatedTarget as Node | null)) return;
      setMenu(null);
    };
    editor.on("transaction", place);
    editor.on("focus", place);
    editor.on("blur", onBlur);
    return () => {
      editor.off("transaction", place);
      editor.off("focus", place);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Đã copy link"),
      () => toast.error("Không copy được link"),
    );
  };

  const edit = ({ url, from, to }: LinkMenu) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.replaceWith(from, to, editor.schema.text(url));
        // Caret at its end, where the chip plugin leaves a URL as text.
        tr.setSelection(TextSelection.create(tr.doc, from + url.length));
        return true;
      })
      .run();
  };

  return (
    <div ref={box} className="relative w-full">
      <EditorContent editor={editor} />
      {menu && (
        <div
          ref={menuRef}
          role="toolbar"
          aria-label="Link"
          style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
          // Keeps the editor focused, and the chip selected, through a click here.
          onMouseDown={(event) => event.preventDefault()}
          onBlur={(event) => {
            const to = event.relatedTarget as Node | null;
            if (!event.currentTarget.contains(to) && !editor?.view.dom.contains(to)) setMenu(null);
          }}
          className="absolute z-20 flex items-center gap-0.5 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <a
            href={menu.url}
            target="_blank"
            rel="noopener noreferrer"
            title={menu.url}
            aria-label={`Mở link ${menu.url}`}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate text-primary underline underline-offset-2">{menu.url}</span>
          </a>
          <button
            type="button"
            aria-label="Copy link"
            title="Copy link"
            onClick={() => copy(menu.url)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CopyIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Sửa link"
            title="Sửa link"
            onClick={() => edit(menu)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
