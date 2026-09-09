import { Extension, type Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

function isList(node: ProseMirrorNode): boolean {
  const name = node.type.name;
  return name === "bulletList" || name === "orderedList";
}

/**
 * Tab on the *first* item of a list, where the list directly follows another
 * one, tucks the whole list inside the previous list's last item.
 *
 * ProseMirror's own `sinkListItem` nests an item under its previous sibling,
 * which means it can never do anything on the first item of a list. Writing
 *
 *     1. Java là gì?
 *     • Ra đời 1995
 *
 * produces two sibling lists, not one nested pair, so Tab on the bullet did
 * nothing at all and the keypress escaped to move focus out of the editor. The
 * whole list moves rather than the single item, because the items after it
 * belong with it — indenting one and orphaning the rest is not what the
 * keystroke is asking for.
 */
export function nestListIntoPreviousList(editor: Editor): boolean {
  const { state } = editor;
  const { $from, empty } = state.selection;
  if (!empty) return false;

  let itemDepth = -1;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "listItem") {
      itemDepth = depth;
      break;
    }
  }
  if (itemDepth < 1) return false;

  const listDepth = itemDepth - 1;
  const list = $from.node(listDepth);
  if (!isList(list)) return false;
  // Anything but the first item is sinkListItem's job and was already tried.
  if ($from.index(listDepth) !== 0) return false;

  const listPos = $from.before(listDepth);
  const $list = state.doc.resolve(listPos);
  const indexInParent = $list.index();
  if (indexInParent === 0) return false;

  const previous = $list.parent.child(indexInParent - 1);
  if (!isList(previous)) return false;

  const lastItem = previous.lastChild;
  if (!lastItem) return false;
  // Ask the schema rather than assume: a list item that cannot hold a list
  // would leave the document invalid.
  if (!lastItem.contentMatchAt(lastItem.childCount).matchType(list.type)) {
    return false;
  }

  const previousStart = listPos - previous.nodeSize;
  // One step in past the previous list's closing token, then one more past its
  // last item's, which lands at the end of that item's content.
  const insertPos = previousStart + previous.nodeSize - 2;

  const tr = state.tr;
  // Delete first: the removed range sits after insertPos, so the insertion
  // point is unaffected by it.
  tr.delete(listPos, listPos + list.nodeSize);
  tr.insert(insertPos, list);
  // The list moved intact, so the caret keeps its offset within it.
  tr.setSelection(
    TextSelection.near(tr.doc.resolve(insertPos + ($from.pos - listPos))),
  );
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Indent the list item the caret is in: the standard sink, falling back to
 * moving the whole list under the one above. Exported so the toolbar button and
 * the Tab key run the same decision.
 */
export function indentList(editor: Editor): boolean {
  if (editor.commands.sinkListItem("listItem")) return true;
  return nestListIntoPreviousList(editor);
}

export const ListNesting = Extension.create({
  name: "listNesting",
  // Above ListItem's own Tab binding, so this decides what Tab means: it tries
  // the standard sink first and only then falls back to the move above.
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Tab: () => indentList(this.editor),
    };
  },
});
