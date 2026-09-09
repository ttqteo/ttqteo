import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** Opener to closer. Quote-likes close with themselves and need extra care. */
const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};

const CLOSERS = new Set(Object.values(PAIRS));
/** Braces that earn a block when Enter is pressed inside them. */
const BLOCK_OPENERS = new Set(["(", "[", "{"]);
const INDENT = "  ";

const WORD = /[\w$]/;

type Cursor = {
  /** Text of the code block the caret sits in. */
  text: string;
  /** Caret offset within that text. */
  offset: number;
};

/**
 * The caret's place inside a code block, or null when it is anywhere else: an
 * empty selection is required, because auto-pairing over a range is a different
 * feature (wrap the selection) and guessing between the two is worse than
 * doing nothing.
 */
function cursorInCode(view: EditorView): Cursor | null {
  const { $from, empty } = view.state.selection;
  if (!empty) return null;
  if (!$from.parent.type.spec.code) return null;
  return {
    text: $from.parent.textContent,
    offset: $from.pos - $from.start(),
  };
}

/**
 * Whether typing `quote` here should open a pair rather than stand alone.
 *
 * Apostrophes are the reason this exists: in `don't` the quote is punctuation,
 * and closing it would give `don''t`. A quote only pairs when it is not
 * touching a word on either side.
 */
function quoteShouldPair(text: string, offset: number): boolean {
  const before = text[offset - 1] ?? "";
  const after = text[offset] ?? "";
  return !WORD.test(before) && !WORD.test(after);
}

/** Leading whitespace of the line the caret is on. */
function currentIndent(text: string, offset: number): string {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart, offset))?.[0] ?? "";
}

/**
 * Bracket and quote behaviour inside code blocks, the part that makes a code
 * block feel like an editor rather than a text box.
 *
 * Everything here is scoped to nodes whose schema says `code`, so prose is
 * untouched — auto-closing a quote mid-sentence would be an active nuisance.
 */
export const CodeAutoPairs = Extension.create({
  name: "codeAutoPairs",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("codeAutoPairs"),
        props: {
          handleTextInput(view, from, to, typed) {
            if (from !== to) return false;
            const cursor = cursorInCode(view);
            if (!cursor) return false;
            const { text, offset } = cursor;

            // Typing the closer that is already sitting there steps over it,
            // so finishing a pair by hand does not leave a stray second one.
            if (CLOSERS.has(typed) && text[offset] === typed) {
              view.dispatch(
                view.state.tr.setSelection(
                  TextSelection.create(view.state.doc, from + 1),
                ),
              );
              return true;
            }

            const close = PAIRS[typed];
            if (!close) return false;
            if (typed === close && !quoteShouldPair(text, offset)) return false;

            // Held in a variable on purpose: `view.state.tr` mints a fresh
            // transaction on every access, so reading it twice would resolve
            // the selection against a document that never saw the insert.
            const tr = view.state.tr.insertText(typed + close, from, to);
            view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from + 1)));
            return true;
          },

          handleKeyDown(view, event) {
            const cursor = cursorInCode(view);
            if (!cursor) return false;
            const { text, offset } = cursor;
            const before = text[offset - 1] ?? "";
            const after = text[offset] ?? "";
            const pos = view.state.selection.from;

            // Backspace between a freshly opened pair removes both halves,
            // rather than leaving the orphaned closer behind.
            if (event.key === "Backspace") {
              if (PAIRS[before] && PAIRS[before] === after) {
                view.dispatch(view.state.tr.delete(pos - 1, pos + 1));
                return true;
              }
              return false;
            }

            // Enter between braces opens a block: an indented empty line with
            // the closer dropped to its own line beneath it.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              BLOCK_OPENERS.has(before) &&
              PAIRS[before] === after
            ) {
              const indent = currentIndent(text, offset);
              const inserted = `\n${indent}${INDENT}\n${indent}`;
              const tr = view.state.tr.insertText(inserted, pos, pos);
              view.dispatch(
                tr.setSelection(
                  TextSelection.create(
                    tr.doc,
                    pos + 1 + indent.length + INDENT.length,
                  ),
                ),
              );
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
