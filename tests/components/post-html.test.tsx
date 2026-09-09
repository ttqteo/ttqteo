import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: '<svg role="img" aria-label="sơ đồ"></svg>' })),
  },
}));

import { PostHtml } from "@/components/post-html";

const MERMAID = '<pre><code class="language-mermaid">graph TD; A--&gt;B</code></pre>';

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
});
