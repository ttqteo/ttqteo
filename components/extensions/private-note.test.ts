import { generateHTML, generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { stripPrivateNotes } from "@/lib/private-note";
import { Callout } from "./callout";
import { CodeBlockWithLanguage } from "./code-block-language";
import { LinkCard } from "./link-card";
import { PrivateNote } from "./private-note";

// Cùng cấu hình với callout.test.ts, thêm PrivateNote. Chạy node này một mình
// là chạy một schema không hề ship, và đúng thứ nó bỏ sót là xung đột parse
// giữa các node cùng giành một thẻ.
const extensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockWithLanguage,
  LinkCard,
  Callout,
  PrivateNote,
];

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

const note = (...content: object[]) => ({ type: "privateNote", content });

const doc = (...content: object[]) => ({ type: "doc", content });

function nodes(html: string) {
  return (generateJSON(html, extensions) as { content: { type: string }[] }).content;
}

describe("stored markup", () => {
  it("ghi ra một aside mang data attribute", () => {
    const html = generateHTML(doc(note(paragraph("Giải thích lại chỗ này"))), extensions);
    expect(html).toContain('<aside class="private-note" data-private-note="">');
    expect(html).toContain("<p>Giải thích lại chỗ này</p>");
  });

  it("chỉ dùng class ngữ nghĩa, không nhét utility của Tailwind", () => {
    const html = generateHTML(doc(note(paragraph("x"))), extensions);
    expect(html).not.toMatch(/class="[^"]*\b(bg|text|border)-[a-z]+-\d{2,3}\b/);
  });
});

describe("round-trip", () => {
  it("đọc lại thành ghi chú riêng", () => {
    const html = generateHTML(doc(note(paragraph("x"))), extensions);
    expect(nodes(html)[0].type).toBe("privateNote");
  });

  it("sống sót qua một vòng render/parse thứ hai", () => {
    const once = generateHTML(doc(note(paragraph("Một"), paragraph("Hai"))), extensions);
    expect(generateHTML(generateJSON(once, extensions), extensions)).toBe(once);
  });

  it("không nuốt aside thường dán từ trang khác", () => {
    expect(nodes("<aside><p>x</p></aside>")[0].type).toBe("paragraph");
  });
});

// Hợp đồng giữa hai nửa: cái editor ghi xuống phải đúng là cái đường đọc công
// khai nhận ra để cắt. Đổi thẻ hay attribute ở một bên mà quên bên kia thì ghi
// chú lọt lên trang, và chỉ nhóm test này bắt được chuyện đó.
describe("stripPrivateNotes trên HTML editor thật sự phát ra", () => {
  it("cắt ghi chú, giữ nguyên đoạn hai bên", () => {
    const html = generateHTML(
      doc(paragraph("Trước"), note(paragraph("Riêng")), paragraph("Sau")),
      extensions,
    );
    expect(stripPrivateNotes(html)).toBe("<p>Trước</p><p>Sau</p>");
  });

  it("cắt cả ghi chú nằm trong callout", () => {
    const html = generateHTML(
      doc({
        type: "callout",
        attrs: { variant: "tip" },
        content: [paragraph("Mẹo"), note(paragraph("Riêng"))],
      }),
      extensions,
    );
    const out = stripPrivateNotes(html);
    expect(out).toContain("<p>Mẹo</p>");
    expect(out).not.toContain("Riêng");
  });

  it("cắt ghi chú có danh sách và khối code bên trong", () => {
    const html = generateHTML(
      doc(
        paragraph("Trước"),
        note(
          paragraph("a"),
          { type: "bulletList", content: [{ type: "listItem", content: [paragraph("b")] }] },
          {
            type: "codeBlock",
            attrs: { language: "html" },
            content: [{ type: "text", text: "</aside><p>lọt</p>" }],
          },
        ),
        paragraph("Sau"),
      ),
      extensions,
    );
    expect(stripPrivateNotes(html)).toBe("<p>Trước</p><p>Sau</p>");
  });
});
