import { Extension } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { tokenize } from "@/lib/code-highlight";

/**
 * Decorations rather than markup: the code block's text has to stay exactly
 * what the author typed, because that string is what gets saved. Colouring it
 * with spans in the document would put the highlighter's output into the post.
 */
function decorate(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== "codeBlock") return;
    let from = pos + 1;
    for (const token of tokenize(
      node.textContent,
      node.attrs.language as string | null,
    )) {
      const to = from + token.text.length;
      if (token.classes.length) {
        decorations.push(
          Decoration.inline(from, to, { class: token.classes.join(" ") }),
        );
      }
      from = to;
    }
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Syntax colours while writing, matching what the published page shows.
 *
 * The whole document is re-tokenised on any change rather than only the block
 * that moved. Working out which steps landed in which code block costs more
 * code than it saves at the length these posts run to; if that stops being
 * true, this is the place to narrow it.
 */
export const CodeHighlighting = Extension.create({
  name: "codeHighlighting",

  addProseMirrorPlugins() {
    const key = new PluginKey<DecorationSet>("codeHighlighting");

    return [
      new Plugin({
        key,
        state: {
          init: (_, { doc }) => decorate(doc),
          apply: (tr, previous) => (tr.docChanged ? decorate(tr.doc) : previous),
        },
        props: {
          decorations(state) {
            return key.getState(state);
          },
        },
      }),
    ];
  },
});
