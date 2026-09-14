import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    // Nhả source ra trong SVG để test phân biệt được sơ đồ nào đang hiện sau
    // khi `html` đổi; nhãn giữ nguyên nên các test cũ không phải sửa.
    render: vi.fn(async (_id: string, source: string) => ({
      svg: `<svg role="img" aria-label="sơ đồ"><text>${source}</text></svg>`,
    })),
  },
}));

import { PostHtml } from "@/components/post-html";

const MERMAID = '<pre><code class="language-mermaid">graph TD; A--&gt;B</code></pre>';
const OTHER_MERMAID =
  '<pre><code class="language-mermaid">sequenceDiagram; A--&gt;&gt;B: chao</code></pre>';

describe("PostHtml", () => {
  it("biến khối mermaid thành sơ đồ", async () => {
    render(<PostHtml html={MERMAID} />);
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("vẫn bọc khối code thường bằng thanh copy như cũ", () => {
    const { container } = render(
      <PostHtml html='<pre><code class="language-java">class A {}</code></pre>' />,
    );
    expect(container.querySelector(".code-shell-lang")?.textContent).toBe("java");
    expect(screen.getByRole("button", { name: "copy" })).toBeInTheDocument();
  });

  it("đánh số dòng cạnh code, ngoài `<code>` nên không lọt vào chữ được copy", () => {
    const { container } = render(
      <StrictMode>
        <PostHtml html={'<pre><code class="language-java">a\nb\nc\n</code></pre>'} />
      </StrictMode>,
    );
    // Một cột số dù effect chạy hai lần; dòng trống cuối không được đánh số
    // vì `<pre>` không vẽ nó.
    const gutters = container.querySelectorAll("pre > .code-gutter");
    expect(gutters).toHaveLength(1);
    expect(gutters[0].textContent).toBe("1\n2\n3");
    expect(gutters[0].getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("pre > code")?.textContent).toBe("a\nb\nc\n");
  });

  it("xử lý được bài có cả hai loại khối", async () => {
    const { container } = render(
      <PostHtml html={MERMAID + '<pre><code class="language-sql">select 1</code></pre>'} />,
    );
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
    // Hai thanh: một do PostHtml dựng cho khối sql, một do MermaidDiagram tự
    // render cho sơ đồ.
    expect(container.querySelectorAll(".code-shell-lang")).toHaveLength(2);
    expect(container.querySelector(".mermaid-slot")).not.toBeNull();
  });

  it("không để lại `<pre>` mermaid trần trong DOM", async () => {
    const { container } = render(<PostHtml html={MERMAID} />);
    await screen.findByRole("img", { name: "sơ đồ" });
    expect(container.querySelector(".mermaid-slot > pre")).toBeNull();
  });

  it("vẽ được sơ đồ dưới StrictMode", async () => {
    // Next 16 bọc cây App Router trong StrictMode, nên effect chạy hai lần
    // trên cùng một DOM. Lần hai không còn `<pre>` mermaid nào để tìm vì lần
    // một đã thay chúng bằng container.
    render(
      <StrictMode>
        <PostHtml html={MERMAID} />
      </StrictMode>,
    );
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("đổi sang sơ đồ mới khi `html` đổi, không để lại slot cũ", async () => {
    const { container, rerender } = render(<PostHtml html={MERMAID} />);
    await screen.findByRole("img", { name: "sơ đồ" });

    rerender(<PostHtml html={OTHER_MERMAID} />);
    await waitFor(() => {
      expect(container.querySelector(".mermaid-slot svg text")?.textContent).toContain(
        "sequenceDiagram",
      );
    });
    expect(container.querySelectorAll(".mermaid-slot")).toHaveLength(1);
  });
});
