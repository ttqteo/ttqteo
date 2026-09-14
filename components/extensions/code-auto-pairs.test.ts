import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { CodeAutoPairs } from "./code-auto-pairs";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function open(content: string): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, CodeAutoPairs],
    content,
  });
  return editor;
}

/** Caret offset inside the first code block, counted in characters. */
function caret(instance: Editor, offset: number): number {
  let pos = -1;
  instance.state.doc.descendants((node, at) => {
    if (pos === -1 && node.type.name === "codeBlock") pos = at + 1;
  });
  if (pos === -1) throw new Error("no code block");
  const target = pos + offset;
  instance.commands.setTextSelection(target);
  return target;
}

/**
 * Runs the plugin's text-input hook the way typing would. The fifth argument
 * is ProseMirror's "what would have happened" transaction; nothing here reads
 * it, but the signature requires it.
 */
function type(instance: Editor, at: number, text: string): boolean {
  return (
    instance.view.someProp("handleTextInput", (f) =>
      f(instance.view, at, at, text, () => instance.state.tr),
    ) ?? false
  );
}

function press(instance: Editor, key: string): boolean {
  return (
    instance.view.someProp("handleKeyDown", (f) =>
      f(instance.view, new KeyboardEvent("keydown", { key })),
    ) ?? false
  );
}

/** Text of the first code block. */
function code(instance: Editor): string {
  let out = "";
  instance.state.doc.descendants((node) => {
    if (!out && node.type.name === "codeBlock") out = node.textContent;
  });
  return out;
}

describe("opening a pair", () => {
  it("closes brackets and puts the caret inside", () => {
    for (const [open_, close] of [
      ["(", ")"],
      ["[", "]"],
      ["{", "}"],
    ]) {
      const e = open("<pre><code></code></pre>");
      const at = caret(e, 0);
      expect(type(e, at, open_)).toBe(true);
      expect(code(e)).toBe(open_ + close);
      expect(e.state.selection.from).toBe(at + 1);
      e.destroy();
    }
    editor = null;
  });

  it("closes quotes when they are not touching a word", () => {
    const e = open("<pre><code></code></pre>");
    const at = caret(e, 0);
    expect(type(e, at, '"')).toBe(true);
    expect(code(e)).toBe('""');
  });

  it("leaves an apostrophe inside a word alone", () => {
    // `don't` must not become `don''t`.
    const e = open("<pre><code>don</code></pre>");
    const at = caret(e, 3);
    expect(type(e, at, "'")).toBe(false);
  });

  it("leaves a quote alone when a word follows", () => {
    const e = open("<pre><code>x</code></pre>");
    const at = caret(e, 0);
    expect(type(e, at, "'")).toBe(false);
  });
});

describe("closing a pair", () => {
  it("steps over a closer that is already there", () => {
    const e = open("<pre><code>()</code></pre>");
    const at = caret(e, 1);
    expect(type(e, at, ")")).toBe(true);
    // Nothing typed, the caret just moved past it.
    expect(code(e)).toBe("()");
    expect(e.state.selection.from).toBe(at + 1);
  });

  it("still inserts a closer when none is waiting", () => {
    const e = open("<pre><code>foo</code></pre>");
    const at = caret(e, 3);
    expect(type(e, at, ")")).toBe(false);
  });
});

describe("backspace", () => {
  it("removes both halves of an empty pair", () => {
    const e = open("<pre><code>a{}b</code></pre>");
    caret(e, 2);
    expect(press(e, "Backspace")).toBe(true);
    expect(code(e)).toBe("ab");
  });

  it("is left alone when the pair is not empty", () => {
    const e = open("<pre><code>{x}</code></pre>");
    caret(e, 1);
    expect(press(e, "Backspace")).toBe(false);
  });
});

describe("enter inside braces", () => {
  it("opens an indented block and drops the closer below", () => {
    const e = open("<pre><code>class A {}</code></pre>");
    caret(e, 9);
    expect(press(e, "Enter")).toBe(true);
    expect(code(e)).toBe("class A {\n  \n}");
  });

  it("keeps the current line's indentation", () => {
    const e = open("<pre><code>  if (x) {}</code></pre>");
    caret(e, 10);
    expect(press(e, "Enter")).toBe(true);
    expect(code(e)).toBe("  if (x) {\n    \n  }");
  });

  it("leaves the caret on the new indented line", () => {
    const e = open("<pre><code>a{}</code></pre>");
    const at = caret(e, 2);
    press(e, "Enter");
    // One newline plus the two-space indent.
    expect(e.state.selection.from).toBe(at + 3);
  });

  it("does nothing between quotes", () => {
    // Asserted on the text, not the return value: Enter in a code block is
    // also claimed by the base keymap, so a boolean says nothing about which
    // plugin acted.
    const e = open("<pre><code>&quot;&quot;</code></pre>");
    caret(e, 1);
    press(e, "Enter");
    expect(code(e)).not.toContain("  ");
  });
});

describe("enter keeps indentation", () => {
  it("carries the current line's indent onto the new line", () => {
    const e = open("<pre><code>  foo</code></pre>");
    const at = caret(e, 5);
    press(e, "Enter");
    expect(code(e)).toBe("  foo\n  ");
    expect(e.state.selection.from).toBe(at + 3);
  });

  it("uses only the indent before the caret", () => {
    const e = open("<pre><code>    x</code></pre>");
    caret(e, 2);
    press(e, "Enter");
    expect(code(e)).toBe("  \n    x");
  });

  it("leaves an unindented line to the base keymap", () => {
    // Asserted on the text for the same reason as "does nothing between
    // quotes" above.
    const e = open("<pre><code>foo</code></pre>");
    caret(e, 3);
    press(e, "Enter");
    expect(code(e)).toBe("foo\n");
  });
});

describe("outside code", () => {
  it("does not pair in a paragraph", () => {
    // Auto-closing a quote mid-sentence would be an active nuisance.
    const e = open("<p>hello</p>");
    let pos = -1;
    e.state.doc.descendants((node, at) => {
      if (pos === -1 && node.isText) pos = at + 5;
    });
    e.commands.setTextSelection(pos);
    expect(type(e, pos, "(")).toBe(false);
    expect(press(e, "Backspace")).toBe(false);
  });
});
