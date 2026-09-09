import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string, source: string) => {
      if (source.includes("boom")) throw new Error("Parse error on line 1");
      return { svg: `<svg data-id="${id}">${source}</svg>` };
    }),
  },
}));

import mermaid from "mermaid";
import { isMermaidPre, languageOf, renderMermaid } from "./mermaid";

function pre(html: string): HTMLPreElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.querySelector("pre")!;
}

describe("languageOf", () => {
  it("đọc ngôn ngữ từ thẻ code, chỗ editor ghi vào", () => {
    expect(languageOf(pre('<pre><code class="language-java">x</code></pre>'))).toBe("java");
  });

  it("đọc ngôn ngữ từ chính thẻ pre, chỗ rehype-prism-plus ghi vào", () => {
    expect(languageOf(pre('<pre class="language-mermaid"><code>x</code></pre>'))).toBe("mermaid");
  });

  it("trả về null khi khối không khai báo ngôn ngữ", () => {
    expect(languageOf(pre("<pre><code>ls -la</code></pre>"))).toBeNull();
  });
});

describe("isMermaidPre", () => {
  it("chỉ nhận đúng language-mermaid", () => {
    expect(isMermaidPre(pre('<pre><code class="language-mermaid">graph TD</code></pre>'))).toBe(true);
    expect(isMermaidPre(pre('<pre><code class="language-mermaidjs">graph TD</code></pre>'))).toBe(false);
  });
});

describe("renderMermaid", () => {
  beforeEach(() => {
    vi.mocked(mermaid.initialize).mockClear();
  });

  it("trả về SVG và chọn theme sáng", async () => {
    const svg = await renderMermaid("graph TD; A-->B", { dark: false });
    expect(svg).toContain("<svg");
    expect(vi.mocked(mermaid.initialize).mock.calls[0][0]).toMatchObject({
      theme: "default",
      securityLevel: "strict",
    });
  });

  it("chọn theme tối khi được yêu cầu", async () => {
    await renderMermaid("graph TD; A-->B", { dark: true });
    expect(vi.mocked(mermaid.initialize).mock.calls[0][0]).toMatchObject({ theme: "dark" });
  });

  it("cấp id khác nhau cho mỗi lần vẽ", async () => {
    const a = await renderMermaid("graph TD; A-->B", { dark: false });
    const b = await renderMermaid("graph TD; A-->B", { dark: false });
    expect(a).not.toBe(b);
  });

  it("để lỗi cú pháp ném ra ngoài cho người gọi xử lý", async () => {
    await expect(renderMermaid("boom", { dark: false })).rejects.toThrow("Parse error");
  });
});
