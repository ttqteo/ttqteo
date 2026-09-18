// Via `@tiptap/react`, which re-exports all of `@tiptap/core`: core is only a
// transitive dependency here and is not resolvable as a bare specifier.
import { Node, mergeAttributes, nodePasteRule } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { linkLabel, trimUrl, URL_PATTERN } from "@/lib/note-links";

/**
 * A URL inside a quick note, shown as a short chip (the site and path) with
 * the full URL on hover; Ctrl+click (Cmd+click) opens it. An inline atom:
 * the caret steps over it, Backspace selects then removes it whole. The note
 * itself stays plain text; the chip writes its URL back out (renderText, and
 * lib/note-doc's docToBody).
 *
 * A typed URL becomes a chip once the caret leaves its end: a space after
 * it, Enter, a click elsewhere. Not before, so `https://a.com/x.html` is not
 * cut at `x` while it is being typed. Punctuation after it stays text, the
 * same trim lib/note-links applies when a note is opened, so a chip made here
 * and one made on the next open are the same chip. A pasted URL becomes a
 * chip at once.
 */
export const LinkChip = Node.create({
  name: "linkChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-link-chip"),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-link-chip]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const url = node.attrs.url as string;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-link-chip": url,
        title: url,
        class: "note-link-chip",
      }),
      linkLabel(url),
    ];
  },

  renderText({ node }) {
    return node.attrs.url as string;
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /https?:\/\/[^\s<>"'`]*[^\s<>"'`.,;:!?)\]}]/g,
        type: this.type,
        getAttributes: (match) => ({ url: match[0] }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin({
        key: new PluginKey("linkChip"),
        appendTransaction(transactions, _before, state) {
          if (!transactions.some((tr) => tr.docChanged || tr.selectionSet)) return null;
          const caret = state.selection.empty ? state.selection.from : null;
          const found: { from: number; to: number; url: string }[] = [];
          state.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            for (const match of node.text.matchAll(URL_PATTERN)) {
              const from = pos + match.index;
              // Still being typed: the caret sits at the end of it.
              if (from + match[0].length === caret) continue;
              const url = trimUrl(match[0]);
              if (!/^https?:\/\/[^/]/i.test(url)) continue;
              found.push({ from, to: from + url.length, url });
            }
          });
          if (found.length === 0) return null;
          const tr = state.tr;
          // Last first, so the earlier positions still hold.
          for (const { from, to, url } of found.reverse()) {
            tr.replaceWith(from, to, type.create({ url }));
          }
          return tr;
        },
        props: {
          handleClickOn(_view, _pos, node, _nodePos, event) {
            if (node.type !== type || !(event.ctrlKey || event.metaKey)) return false;
            window.open(node.attrs.url as string, "_blank", "noopener,noreferrer");
            return true;
          },
        },
      }),
    ];
  },
});
