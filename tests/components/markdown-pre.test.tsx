import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: '<svg role="img" aria-label="sơ đồ"></svg>' })),
  },
}));

import Pre from "@/components/markdown/pre";

describe("Pre", () => {
  it("đưa fence mermaid sang MermaidDiagram, dùng source gốc chứ không phải markup đã tô màu", async () => {
    render(
      <Pre className="language-mermaid" raw="graph TD; A-->B">
        <code>
          <span className="token">graph</span>
        </code>
      </Pre>,
    );
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("để khối code thường đi đường cũ", () => {
    const { container } = render(
      <Pre className="language-java" raw="class A {}">
        <code>class A {}</code>
      </Pre>,
    );
    expect(container.querySelector("pre")).not.toBeNull();
  });

  it("không nhận nhầm ngôn ngữ có tiền tố giống", () => {
    const { container } = render(
      <Pre className="language-mermaidjs" raw="x">
        <code>x</code>
      </Pre>,
    );
    expect(container.querySelector("pre")).not.toBeNull();
  });
});
