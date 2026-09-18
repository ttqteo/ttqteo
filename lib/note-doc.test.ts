import { describe, expect, it } from "vitest";
import { bodyToDoc, docToBody } from "./note-doc";

const P = "paragraph";

describe("bodyToDoc", () => {
  it("makes a paragraph of each line, with each URL as a chip", () => {
    expect(bodyToDoc("free key\nhttps://a.com/x rồi\n\nđọc")).toEqual({
      type: "doc",
      content: [
        { type: P, content: [{ type: "text", text: "free key" }] },
        {
          type: P,
          content: [
            { type: "linkChip", attrs: { url: "https://a.com/x" } },
            { type: "text", text: " rồi" },
          ],
        },
        { type: P },
        { type: P, content: [{ type: "text", text: "đọc" }] },
      ],
    });
  });

  it("gives an empty note one empty paragraph", () => {
    expect(bodyToDoc("")).toEqual({ type: "doc", content: [{ type: P }] });
  });
});

describe("docToBody", () => {
  it("writes the chips back out as their URLs", () => {
    expect(
      docToBody({
        type: "doc",
        content: [
          {
            type: P,
            content: [
              { type: "text", text: "xem " },
              { type: "linkChip", attrs: { url: "https://a.com/x" } },
              { type: "text", text: "." },
            ],
          },
          { type: P },
        ],
      }),
    ).toBe("xem https://a.com/x.\n");
  });

  it("reads a run of inline nodes with no paragraph around them as one line", () => {
    // What a copied selection of a chip, or of text and chips inside one line, holds.
    expect(docToBody({ content: [{ type: "linkChip", attrs: { url: "https://a.com/x" } }] })).toBe(
      "https://a.com/x",
    );
    expect(
      docToBody({
        content: [
          { type: "text", text: "xem " },
          { type: "linkChip", attrs: { url: "https://a.com/x" } },
        ],
      }),
    ).toBe("xem https://a.com/x");
  });

  it("round-trips a note, spaces and blank lines included", () => {
    const body = "  free key deepseek \n\nhttps://www.orcarouter.ai/\ngroq https://console.groq.com/home (đọc)\n";
    expect(docToBody(bodyToDoc(body))).toBe(body);
  });
});
