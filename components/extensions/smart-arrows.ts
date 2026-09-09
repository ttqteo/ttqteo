import { Extension, InputRule } from "@tiptap/react";

/**
 * Typed sequence to the character it is standing in for. Ordered longest-first
 * so `-->` does not get eaten by the `->` rule before it is finished.
 */
const ARROWS: { find: RegExp; replace: string }[] = [
  { find: /<->$/, replace: "↔" },
  { find: /->$/, replace: "→" },
  { find: /=>$/, replace: "⇒" },
  { find: /<-$/, replace: "←" },
  { find: /<=$/, replace: "⇐" },
];

/**
 * Turns arrow sequences into real arrow characters as you type.
 *
 * Skipped inside code, where `=>` is a lambda and `->` is a member access
 * rather than a symbol, and where silently rewriting either would corrupt the
 * snippet. Undo puts the typed characters back, so a false positive costs one
 * keystroke.
 */
export const SmartArrows = Extension.create({
  name: "smartArrows",

  addInputRules() {
    return ARROWS.map(
      ({ find, replace }) =>
        new InputRule({
          find,
          handler: ({ state, range, chain }) => {
            const $from = state.doc.resolve(range.from);
            if ($from.parent.type.spec.code) return;
            const codeMark = state.schema.marks.code;
            if (
              codeMark &&
              state.doc.rangeHasMark(range.from, range.to, codeMark)
            ) {
              return;
            }
            chain().insertContentAt(range, replace).run();
          },
        }),
    );
  },
});
