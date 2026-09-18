import { splitLinks } from "@/lib/note-links";

/**
 * A quick note is stored as plain text, and edited in a small ProseMirror
 * editor that shows each URL as a chip. These two turn one into the other:
 * a line is a paragraph, a URL is a `linkChip` node whose text is the URL.
 * Round-tripping a body through both gives the body back, blank lines and
 * spaces included, so what is stored never changes shape.
 */

export type InlineJson =
  | { type: "text"; text: string }
  | { type: "linkChip"; attrs: { url: string } };

export type ParagraphJson = { type: "paragraph"; content?: InlineJson[] };

export type DocJson = { type: "doc"; content: ParagraphJson[] };

export function bodyToDoc(body: string): DocJson {
  const content = body.split("\n").map((line): ParagraphJson => {
    const inline = splitLinks(line).map(
      (part): InlineJson =>
        part.kind === "text"
          ? { type: "text", text: part.text }
          : { type: "linkChip", attrs: { url: part.url } },
    );
    return inline.length > 0 ? { type: "paragraph", content: inline } : { type: "paragraph" };
  });
  return { type: "doc", content };
}

type AnyNode = { type?: string; text?: string; attrs?: { url?: string }; content?: AnyNode[] };

/** The body a document holds; anything that is not text or a chip writes nothing. */
export function docToBody(doc: { type?: string; content?: unknown[] }): string {
  const paragraphs = (doc.content ?? []) as AnyNode[];
  return paragraphs
    .map((paragraph) =>
      (paragraph.content ?? [])
        .map((node) => {
          if (node.type === "text") return node.text ?? "";
          if (node.type === "linkChip") return node.attrs?.url ?? "";
          return "";
        })
        .join(""),
    )
    .join("\n");
}
