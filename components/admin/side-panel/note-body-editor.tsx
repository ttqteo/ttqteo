"use client";

import { LinkChip } from "@/components/extensions/link-chip";
import { MAX_NOTE_LENGTH } from "@/lib/admin-notes";
import { bodyToDoc, docToBody } from "@/lib/note-doc";
import { Extension, EditorContent, useEditor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

/**
 * Refuses any change that would take the note past MAX_NOTE_LENGTH, the
 * server's limit, as the textarea's maxLength did. A change that shortens
 * the note always goes through.
 */
const MaxLength = Extension.create({
  name: "noteMaxLength",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("noteMaxLength"),
        filterTransaction(tr, state) {
          if (!tr.docChanged) return true;
          const after = docToBody(tr.doc.toJSON()).length;
          return after <= MAX_NOTE_LENGTH || after <= docToBody(state.doc.toJSON()).length;
        },
      }),
    ];
  },
});

/**
 * The text of a quick note, edited as lines of plain text with each URL shown
 * as a short chip (components/extensions/link-chip.ts). Only paragraphs, text
 * and chips exist here: no bold, lists or headings, and no Markdown shortcuts
 * turning "- " into a list, so what is saved is exactly what was typed.
 * `onChange` gets the note's body as plain text, URLs written out in full.
 */
export function NoteBodyEditor({
  body,
  onChange,
}: {
  body: string;
  onChange: (body: string) => void;
}) {
  // The latest callback, for the editor's own onUpdate, which is set once.
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);

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
      MaxLength,
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
      // Pasted text keeps its lines as typed, blank ones included, and its
      // URLs come in as chips. ProseMirror's own parser folds blank lines.
      clipboardTextParser(text, _context, _plain, view) {
        const doc = view.state.schema.nodeFromJSON(bodyToDoc(text.replace(/\r\n?/g, "\n")));
        return Slice.maxOpen(Fragment.from(doc.content));
      },
      // Copied text is the note's own text: one newline per line, full URLs.
      clipboardTextSerializer(slice) {
        return docToBody({ content: slice.content.toJSON() ?? [] });
      },
    },
    onUpdate({ editor: updated }) {
      change.current(docToBody(updated.getJSON()));
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

  return <EditorContent editor={editor} className="w-full" />;
}
