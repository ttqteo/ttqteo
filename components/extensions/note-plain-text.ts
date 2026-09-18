// Via `@tiptap/react`, which re-exports all of `@tiptap/core`: core is only a
// transitive dependency here and is not resolvable as a bare specifier.
import { Extension } from "@tiptap/react";
import { Fragment, Slice } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { bodyToDoc, docToBody } from "@/lib/note-doc";

/**
 * What makes the Ghi nhanh editor behave like the plain-text box it replaced:
 *
 * - Pasted text keeps its lines as typed, blank ones included, and its URLs
 *   come in as chips. ProseMirror's own text parser folds blank lines.
 * - Copied text is the note's own text: one newline per line, and each chip
 *   written out as its full URL. Left to ProseMirror, a selected chip copies
 *   as nothing at all, since an inline atom has no text of its own.
 * - A change that would take the note past `maxLength` is refused, as the
 *   textarea's maxLength did. A change that shortens the note always goes.
 * - Escape on a selected chip lets go of it, caret just after, and keeps the
 *   key from also closing the side panel around the editor.
 */
export const NotePlainText = Extension.create<{ maxLength: number }>({
  name: "notePlainText",

  addOptions() {
    return { maxLength: Infinity };
  },

  addProseMirrorPlugins() {
    const { maxLength } = this.options;
    return [
      new Plugin({
        key: new PluginKey("notePlainText"),
        filterTransaction(tr, state) {
          if (!tr.docChanged || maxLength === Infinity) return true;
          const after = docToBody(tr.doc.toJSON()).length;
          return after <= maxLength || after <= docToBody(state.doc.toJSON()).length;
        },
        props: {
          clipboardTextParser(text, _context, _plain, view) {
            const doc = view.state.schema.nodeFromJSON(bodyToDoc(text.replace(/\r\n?/g, "\n")));
            return Slice.maxOpen(Fragment.from(doc.content));
          },
          clipboardTextSerializer(slice) {
            return docToBody({ content: slice.content.toJSON() ?? [] });
          },
          handleKeyDown(view, event) {
            if (event.key !== "Escape" || event.isComposing) return false;
            const { selection } = view.state;
            if (!(selection instanceof NodeSelection) || selection.node.type.name !== "linkChip") {
              return false;
            }
            view.dispatch(
              view.state.tr.setSelection(TextSelection.create(view.state.doc, selection.to)),
            );
            return true;
          },
        },
      }),
    ];
  },
});
