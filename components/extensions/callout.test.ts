import { generateHTML, generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { CALLOUT_VARIANTS, Callout } from "./callout";
import { CodeBlockWithLanguage } from "./code-block-language";
import { LinkCard } from "./link-card";

// Mirrors how SimpleEditor is wired, giống code-block-language.test.ts: khối
// code của StarterKit tắt đi, khối có picker thay chỗ, và link card đứng cạnh
// callout. Chạy `[StarterKit, Callout]` là chạy một cấu hình không hề ship, và
// đúng thứ nó bỏ sót là xung đột parse giữa các node cùng giành một thẻ, thứ
// đã bắt link-card.ts phải đặt priority. Link/Underline/Image/ListNesting/
// SmartArrows không có mặt vì không cái nào giành `div` hay `pre`.
const extensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockWithLanguage,
  LinkCard,
  Callout,
];

const doc = (variant: string | null, text: string) => ({
  type: "doc",
  content: [
    {
      type: "callout",
      attrs: variant === null ? {} : { variant },
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
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
  it("ghi kiểu ra cả data attribute lẫn class", () => {
    const html = generateHTML(doc("warning", "Cẩn thận"), extensions);
    expect(html).toContain('data-callout="warning"');
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain("<p>Cẩn thận</p>");
  });

  it("dùng note khi không chỉ định kiểu", () => {
    expect(generateHTML(doc(null, "Tóm tắt"), extensions)).toContain('data-callout="note"');
  });

  it("chỉ dùng class ngữ nghĩa, không nhét utility của Tailwind", () => {
    // Tailwind chỉ quét .ts/.tsx, nên utility nằm trong một chuỗi dưới database
    // không được sinh CSS và sẽ xẹp ở production.
    const html = generateHTML(doc("danger", "x"), extensions);
    expect(html).not.toMatch(/class="[^"]*\b(bg|text|border)-[a-z]+-\d{2,3}\b/);
  });
});

describe("round-trip", () => {
  it("đọc lại kiểu từ data attribute", () => {
    const parsed = nodes(generateHTML(doc("tip", "Mẹo"), extensions));
    expect(parsed[0].type).toBe("callout");
    expect(parsed[0].attrs.variant).toBe("tip");
  });

  it("sống sót qua một vòng render/parse thứ hai", () => {
    const once = generateHTML(doc("note", "Tóm tắt"), extensions);
    expect(generateHTML(generateJSON(once, extensions), extensions)).toBe(once);
  });

  it("hạ một kiểu lạ về note thay vì giữ rác", () => {
    // Không như ngôn ngữ của code block (chỉ là tên class, giữ nguyên là an
    // toàn), kiểu callout ứng với một class có style thật. Một giá trị lạ sẽ
    // ra khối không có nền, trông như hỏng.
    const parsed = nodes('<div data-callout="chartreuse"><p>x</p></div>');
    expect(parsed[0].attrs.variant).toBe("note");
  });

  it("giữ được nhiều đoạn và danh sách bên trong", () => {
    const html = '<div data-callout="note"><p>Một</p><ul><li><p>Hai</p></li></ul></div>';
    const parsed = nodes(html);
    expect(parsed[0].type).toBe("callout");
    expect(generateHTML(generateJSON(html, extensions), extensions)).toContain("<ul>");
  });

  it("không nuốt div thường", () => {
    expect(nodes("<div><p>x</p></div>")[0].type).toBe("paragraph");
  });
});

describe("variant list", () => {
  it("không trùng và note đứng đầu để làm mặc định", () => {
    expect(new Set(CALLOUT_VARIANTS).size).toBe(CALLOUT_VARIANTS.length);
    expect(CALLOUT_VARIANTS[0]).toBe("note");
  });
});
