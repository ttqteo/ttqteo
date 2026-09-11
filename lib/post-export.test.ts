import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { EditorTable } from "@/components/extensions/table";
import { htmlToMarkdown, htmlToText, postToMarkdown, postToText } from "@/lib/post-export";

const md = htmlToMarkdown;
const text = htmlToText;

/** Một bảng dựng bằng chính extension của editor, hàng đầu là ô tiêu đề. */
function editorTable(rows: string[][]): string {
  const cell = (type: string, value: string) => ({
    type,
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  });
  const doc = {
    type: "doc",
    content: [
      {
        type: "table",
        content: rows.map((row, index) => ({
          type: "tableRow",
          content: row.map((value) => cell(index === 0 ? "tableHeader" : "tableCell", value)),
        })),
      },
    ],
  };
  return generateHTML(doc, [StarterKit, EditorTable]);
}

const BOOKMARK =
  '<a class="link-card" href="https://a.dev" target="_blank" rel="noopener noreferrer" data-link-card="bookmark" data-url="https://a.dev" data-title="Bài hay"><span class="link-card-body"><span class="link-card-title">Bài hay</span><span class="link-card-meta"><span class="link-card-url">https://a.dev</span></span></span></a>';

const NOTE = '<aside class="private-note" data-private-note=""><p>b</p></aside>';

describe("htmlToMarkdown: khối", () => {
  it("tiêu đề và đoạn văn cách nhau một dòng trống", () => {
    expect(md("<h1>Mở đầu</h1><p>Một</p><h3>Chi tiết</h3><p>Hai</p>")).toBe(
      "# Mở đầu\n\nMột\n\n### Chi tiết\n\nHai",
    );
  });

  it("bỏ dòng trống của editor", () => {
    expect(md("<p>Một</p><p></p><p></p><p>Hai</p>")).toBe("Một\n\nHai");
  });

  it("list lồng thụt theo độ rộng của dấu, list số giữ start", () => {
    expect(
      md("<ul><li><p>Một</p><ul><li><p>Một một</p></li></ul></li><li><p>Hai</p></li></ul>"),
    ).toBe("- Một\n  - Một một\n- Hai");
    expect(
      md('<ol start="3"><li><p>Ba</p></li><li><p>Bốn</p><ol><li><p>a</p></li></ol></li></ol>'),
    ).toBe("3. Ba\n4. Bốn\n   1. a");
  });

  it("mục list có hai đoạn thì đoạn sau thụt vào dưới mục", () => {
    expect(md("<ul><li><p>Một</p><p>Tiếp</p></li></ul>")).toBe("- Một\n\n  Tiếp");
  });

  it("trích dẫn nhiều đoạn", () => {
    expect(md("<blockquote><p>Một</p><p>Hai</p></blockquote>")).toBe("> Một\n>\n> Hai");
  });

  it("callout thành GitHub alert, danger thành CAUTION", () => {
    expect(md('<div class="callout callout-tip" data-callout="tip"><p>Mẹo</p></div>')).toBe(
      "> [!TIP]\n> Mẹo",
    );
    expect(md('<div class="callout callout-danger" data-callout="danger"><p>Dừng</p></div>')).toBe(
      "> [!CAUTION]\n> Dừng",
    );
  });

  it("khối code giữ ngôn ngữ", () => {
    expect(md('<pre><code class="language-java">class A {}\nclass B {}</code></pre>')).toBe(
      "```java\nclass A {}\nclass B {}\n```",
    );
  });

  it("fence dài hơn chuỗi backtick dài nhất trong code", () => {
    expect(md("<pre><code>```\nx\n```</code></pre>")).toBe("````\n```\nx\n```\n````");
  });

  it("sơ đồ mermaid là khối code ngôn ngữ mermaid", () => {
    expect(md('<pre><code class="language-mermaid">graph TD; A--&gt;B</code></pre>')).toBe(
      "```mermaid\ngraph TD; A-->B\n```",
    );
  });

  it("đường kẻ và ảnh", () => {
    expect(md('<p>a</p><hr><img src="https://x.dev/a.png" alt="Sơ đồ">')).toBe(
      "a\n\n---\n\n![Sơ đồ](https://x.dev/a.png)",
    );
  });

  it("link card có tiêu đề thành link, không có thì thành autolink", () => {
    expect(md(BOOKMARK)).toBe("[Bài hay](https://a.dev)");
    expect(
      md(
        '<a class="link-card" href="https://a.dev" data-link-card="bookmark" data-url="https://a.dev"><span class="link-card-body"><span class="link-card-meta"><span class="link-card-url">https://a.dev</span></span></span></a>',
      ),
    ).toBe("<https://a.dev>");
  });

  it("video nhúng thành link tới trang gốc", () => {
    expect(
      md(
        '<div class="link-card-embed" data-link-card="embed" data-url="https://youtu.be/x" data-embed-src="https://www.youtube.com/embed/x" data-title="Video"><iframe src="https://www.youtube.com/embed/x"></iframe></div>',
      ),
    ).toBe("[Video](https://youtu.be/x)");
  });

  it("bỏ ghi chú riêng", () => {
    expect(md(`<p>a</p>${NOTE}<p>c</p>`)).toBe("a\n\nc");
  });
});

describe("htmlToMarkdown: bảng", () => {
  it("bảng editor lưu thành bảng GFM, hàng đầu làm tiêu đề", () => {
    const html = editorTable([
      ["Tên", "Kiểu"],
      ["id", "uuid"],
    ]);
    // Để chắc đang thử đúng HTML editor lưu, có cả vỏ lẫn colgroup.
    expect(html).toContain("tableWrapper");
    expect(html).toContain("<colgroup>");
    expect(md(html)).toBe("| Tên | Kiểu |\n| --- | --- |\n| id | uuid |");
  });

  it("bảng không có hàng tiêu đề vẫn lấy hàng đầu làm tiêu đề", () => {
    expect(md("<table><tbody><tr><td><p>a</p></td></tr><tr><td><p>b</p></td></tr></tbody></table>")).toBe(
      "| a |\n| --- |\n| b |",
    );
  });

  it("escape dấu | trong ô và đệm ô cho hàng thiếu", () => {
    expect(
      md(
        "<table><tbody><tr><th><p>a|b</p></th><th><p>c</p></th></tr><tr><td><p>d</p></td></tr></tbody></table>",
      ),
    ).toBe("| a\\|b | c |\n| --- | --- |\n| d |  |");
  });

  it("ô có nhiều đoạn thì nối bằng <br>", () => {
    expect(md("<table><tbody><tr><td><p>Một</p><p>Hai</p></td></tr></tbody></table>")).toBe(
      "| Một<br>Hai |\n| --- |",
    );
  });

  it("định dạng trong ô vẫn giữ", () => {
    expect(
      md(
        "<table><tbody><tr><th><p><strong>A</strong></p></th></tr><tr><td><p><code>x</code></p></td></tr></tbody></table>",
      ),
    ).toBe("| **A** |\n| --- |\n| `x` |");
  });
});

describe("htmlToMarkdown: chữ", () => {
  it("đậm, nghiêng, gạch, code; gạch dưới thành chữ trơn", () => {
    expect(
      md("<p><strong>đậm</strong> <em>nghiêng</em> <s>gạch</s> <u>dưới</u> <code>x</code></p>"),
    ).toBe("**đậm** *nghiêng* ~~gạch~~ dưới `x`");
  });

  it("khoảng trắng ở mép được đưa ra ngoài dấu", () => {
    expect(md("<p>a<strong> đậm </strong>b</p>")).toBe("a **đậm** b");
  });

  it("code chứa backtick dùng fence dài hơn", () => {
    expect(md("<p><code>a`b</code></p>")).toBe("``a`b``");
    expect(md("<p><code>`x</code></p>")).toBe("`` `x ``");
  });

  it("link, chữ trùng url thì thành autolink", () => {
    expect(
      md('<p><a href="https://a.dev">trang</a> và <a href="https://b.dev">https://b.dev</a></p>'),
    ).toBe("[trang](https://a.dev) và <https://b.dev>");
  });

  it("xuống dòng cứng", () => {
    expect(md("<p>một<br>hai</p>")).toBe("một\\\nhai");
  });

  it("escape ký tự Markdown trong chữ", () => {
    expect(md("<p>2 * 3 = 6, [x], a_b, ~5 phút, `y`</p>")).toBe(
      "2 \\* 3 = 6, \\[x\\], a\\_b, \\~5 phút, \\`y\\`",
    );
  });

  it("escape dấu đầu dòng dễ bị hiểu nhầm", () => {
    expect(
      md(
        "<p># không phải tiêu đề</p><p>1. không phải list</p><p>- cũng không</p><p>&gt; không phải trích dẫn</p>",
      ),
    ).toBe(
      "\\# không phải tiêu đề\n\n1\\. không phải list\n\n\\- cũng không\n\n\\> không phải trích dẫn",
    );
  });

  it("chữ thường không bị escape thừa", () => {
    expect(md("<p>Java 21 (LTS) - bản mới: 100% miễn phí! #1</p>")).toBe(
      "Java 21 (LTS) - bản mới: 100% miễn phí! #1",
    );
  });
});

describe("postToMarkdown", () => {
  it("tiêu đề và mô tả đứng đầu", () => {
    expect(
      postToMarkdown({ title: "Java *core*", description: "Ghi chép", content: "<p>Thân</p>" }),
    ).toBe("# Java \\*core\\*\n\nGhi chép\n\nThân");
  });

  it("thiếu phần nào thì bỏ phần đó", () => {
    expect(postToMarkdown({ title: "T", description: " ", content: "<p>x</p>" })).toBe("# T\n\nx");
    expect(postToMarkdown({ title: "", description: "", content: "<p>x</p>" })).toBe("x");
    expect(postToMarkdown({ title: "", description: "", content: "" })).toBe("");
  });
});

describe("htmlToText", () => {
  it("bỏ mọi định dạng và không escape, link chỉ còn chữ", () => {
    expect(
      text('<h2>Mở đầu</h2><p><strong>đậm</strong> <a href="https://a.dev">trang</a> 2 * 3 [x]</p>'),
    ).toBe("Mở đầu\n\nđậm trang 2 * 3 [x]");
  });

  it("list giữ dấu và thụt lề", () => {
    expect(text("<ol><li><p>Một</p><ul><li><p>a</p></li></ul></li><li><p>Hai</p></li></ol>")).toBe(
      "1. Một\n   - a\n2. Hai",
    );
  });

  it("bảng: mỗi hàng một dòng, ô cách nhau bằng Tab", () => {
    const html = editorTable([
      ["Tên", "Kiểu"],
      ["id", "uuid"],
    ]);
    expect(text(html)).toBe("Tên\tKiểu\nid\tuuid");
  });

  it("code, trích dẫn và callout chỉ còn nội dung", () => {
    expect(
      text(
        '<pre><code class="language-sh">echo hi</code></pre><blockquote><p>Q</p></blockquote><div class="callout callout-note" data-callout="note"><p>N</p></div>',
      ),
    ).toBe("echo hi\n\nQ\n\nN");
  });

  it("link card: tiêu đề rồi url ở dòng dưới", () => {
    expect(text(BOOKMARK)).toBe("Bài hay\nhttps://a.dev");
  });

  it("xuống dòng cứng giữ nguyên, ảnh bị bỏ", () => {
    expect(text('<p>một<br>hai</p><img src="https://x.dev/a.png">')).toBe("một\nhai");
  });

  it("bỏ ghi chú riêng", () => {
    expect(text(`<p>a</p>${NOTE}<p>c</p>`)).toBe("a\n\nc");
  });
});

describe("postToText", () => {
  it("tiêu đề, mô tả rồi thân bài, không escape", () => {
    expect(
      postToText({ title: "Java *core*", description: "Ghi chép", content: "<p>Thân</p>" }),
    ).toBe("Java *core*\n\nGhi chép\n\nThân");
  });
});
