import { describe, expect, it } from "vitest";
import { resolveLanguage, tokenize } from "./code-highlight";

/** Rebuilds the input from the token runs. */
const joined = (code: string, lang: string | null) =>
  tokenize(code, lang)
    .map((t) => t.text)
    .join("");

describe("resolveLanguage", () => {
  it("accepts the languages the picker offers", () => {
    for (const name of ["java", "python", "typescript", "sql", "bash", "yaml"]) {
      expect(resolveLanguage(name), name).toBe(name);
    }
  });

  it("maps the names Prism knows differently", () => {
    expect(resolveLanguage("html")).toBe("markup");
    expect(resolveLanguage("js")).toBe("javascript");
    expect(resolveLanguage("sh")).toBe("bash");
  });

  it("is case and whitespace insensitive", () => {
    expect(resolveLanguage("  Java ")).toBe("java");
  });

  it("returns null for no language, an unknown one, and mermaid", () => {
    expect(resolveLanguage(null)).toBeNull();
    expect(resolveLanguage("")).toBeNull();
    expect(resolveLanguage("brainfuck")).toBeNull();
    // Mermaid renders as a diagram; highlighting its source would colour
    // something the reader never sees.
    expect(resolveLanguage("mermaid")).toBeNull();
  });
});

describe("tokenize", () => {
  it("emits Prism's token classes, which syntax.css already styles", () => {
    const tokens = tokenize("class A {}", "java");
    const keyword = tokens.find((t) => t.text === "class");
    expect(keyword?.classes).toContain("token");
    expect(keyword?.classes).toContain("keyword");
  });

  it("keeps every character, so the block still reads correctly", () => {
    const code = "const x = 1; // hi\nreturn x;";
    expect(joined(code, "javascript")).toBe(code);
  });

  it("carries both classes through a nested token", () => {
    // Prism nests tokens, and the stylesheet cares about the inner one, so a
    // flat list has to keep the ancestors' classes too.
    const tokens = tokenize('const s = "hi";', "javascript");
    expect(tokens.some((t) => t.classes.length > 1)).toBe(true);
  });

  it("returns the code untouched when there is no language", () => {
    expect(tokenize("plain text", null)).toEqual([
      { text: "plain text", classes: [] },
    ]);
  });

  it("returns the code untouched for an unknown language", () => {
    expect(tokenize("whatever", "brainfuck")).toEqual([
      { text: "whatever", classes: [] },
    ]);
  });

  it("survives an empty block", () => {
    expect(joined("", "java")).toBe("");
  });

  it("preserves leading whitespace, which indentation depends on", () => {
    const code = "  if (x) {\n    y();\n  }";
    expect(joined(code, "java")).toBe(code);
  });
});
