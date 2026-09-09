import { generateHTML, generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { CODE_LANGUAGES, CodeBlockWithLanguage } from "./code-block-language";

// Matches how SimpleEditor is wired: StarterKit's own code block off, this one
// in its place. If those two ever disagree the editor gets two nodes competing
// for `<pre>`, which is exactly what these tests would catch.
const extensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockWithLanguage,
];

const doc = (language: string | null, text: string) => ({
  type: "doc",
  content: [
    {
      type: "codeBlock",
      attrs: { language },
      content: [{ type: "text", text }],
    },
  ],
});

function nodes(html: string) {
  return (
    generateJSON(html, extensions) as {
      content: { type: string; attrs: Record<string, unknown> }[];
    }
  ).content;
}

describe("stored markup", () => {
  it("writes the language as a class the rest of the stack already understands", () => {
    // `language-*` is what rehype-prism-plus emits for MDX and what PostHtml
    // reads back to label the block, so the editor has to speak the same thing.
    const html = generateHTML(doc("java", "class ThamSoSai {}"), extensions);
    expect(html).toContain('<code class="language-java">');
    expect(html).toContain("class ThamSoSai {}");
  });

  it("writes a plain code block when no language is chosen", () => {
    const html = generateHTML(doc(null, "echo hi"), extensions);
    expect(html).toContain("<pre><code>");
    expect(html).not.toContain("language-");
  });
});

describe("round-trip", () => {
  it("reads the language back", () => {
    const parsed = nodes(generateHTML(doc("python", "print(1)"), extensions));
    expect(parsed[0].type).toBe("codeBlock");
    expect(parsed[0].attrs.language).toBe("python");
  });

  it("survives a second render/parse cycle unchanged", () => {
    const once = generateHTML(doc("sql", "select 1"), extensions);
    expect(generateHTML(generateJSON(once, extensions), extensions)).toBe(once);
  });

  it("leaves a block saved before the picker existed alone", () => {
    // No language class at all: the older editor wrote these, and they must not
    // come back with a language invented for them.
    const parsed = nodes("<pre><code>ls -la</code></pre>");
    expect(parsed[0].type).toBe("codeBlock");
    expect(parsed[0].attrs.language).toBeNull();
  });

  it("keeps a language the picker does not offer", () => {
    // The value is only ever a class name, so an unlisted language still
    // round-trips rather than being silently dropped.
    const parsed = nodes('<pre><code class="language-nim">echo 1</code></pre>');
    expect(parsed[0].attrs.language).toBe("nim");
  });
});

describe("language list", () => {
  it("has no duplicates and stays sorted", () => {
    expect(new Set(CODE_LANGUAGES).size).toBe(CODE_LANGUAGES.length);
    expect([...CODE_LANGUAGES]).toEqual([...CODE_LANGUAGES].sort());
  });
});

describe("mermaid", () => {
  it("nằm trong danh sách chọn được", () => {
    expect(CODE_LANGUAGES).toContain("mermaid");
  });

  it("lưu xuống đúng class mà PostHtml và rehype-prism-plus cùng hiểu", () => {
    const html = generateHTML(doc("mermaid", "graph TD; A-->B"), extensions);
    expect(html).toContain('<code class="language-mermaid">');
    expect(html).toContain("graph TD; A--&gt;B");
  });

  it("đọc ngược lại được sau một vòng render/parse", () => {
    const once = generateHTML(doc("mermaid", "graph TD; A-->B"), extensions);
    expect(generateHTML(generateJSON(once, extensions), extensions)).toBe(once);
  });
});
