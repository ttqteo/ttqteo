import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string, source: string) => {
      if (source.includes("boom")) throw new Error("Parse error on line 1");
      if (source.includes("empty")) return { svg: "" };
      return { svg: '<svg role="img" aria-label="sơ đồ"></svg>' };
    }),
  },
}));

import { MermaidDiagram } from "@/components/mermaid-diagram";

const CHART = "graph TD; A-->B";

describe("MermaidDiagram", () => {
  it("vẽ sơ đồ ra SVG", async () => {
    render(<MermaidDiagram source={CHART} />);
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("hiện source khi bấm nút xem code, và quay lại được", async () => {
    const user = userEvent.setup();
    render(<MermaidDiagram source={CHART} />);
    await screen.findByRole("img", { name: "sơ đồ" });

    await user.click(screen.getByRole("button", { name: "code" }));
    expect(screen.getByText(CHART)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "sơ đồ" }));
    expect(screen.getByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("không đứng mãi ở skeleton khi mermaid trả về SVG rỗng", async () => {
    // Chuỗi rỗng là falsy, nên nhánh `svg ? sơ đồ : skeleton` đọc nó là "chưa
    // vẽ xong" và khối treo ở "đang vẽ sơ đồ…" vĩnh viễn, không lỗi, không
    // đường ra. Đây đúng là triệu chứng người dùng gặp trong editor.
    render(<MermaidDiagram source="empty" />);
    expect(await screen.findByText("empty")).toBeInTheDocument();
    expect(screen.queryByText("đang vẽ sơ đồ…")).not.toBeInTheDocument();
  });

  it("giữ lại source khi cú pháp sai, không nuốt mất khối", async () => {
    render(<MermaidDiagram source="boom" />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByText(/Parse error on line 1/)).toBeInTheDocument();
  });

  it("copy đúng source gốc chứ không phải SVG", async () => {
    // setup() tự cắm clipboard stub của riêng nó vào navigator, nên spy phải
    // đặt sau, không thì nó bị ghi đè và không bao giờ được gọi.
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<MermaidDiagram source={CHART} />);
    await screen.findByRole("img", { name: "sơ đồ" });
    await user.click(screen.getByRole("button", { name: "copy" }));

    expect(writeText).toHaveBeenCalledWith(CHART);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "đã copy" })).toBeInTheDocument(),
    );
  });
});
