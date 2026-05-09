import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { IndexTable } from "@/components/portfolio/IndexTable";
import type { IndexEntry } from "@/components/portfolio/IndexTable";

const sample: IndexEntry[] = [
  {
    year: 2026,
    title: "vnstock-js",
    role: "solo",
    stack: ["TypeScript", "Node"],
    metric: "npm 1.2k",
    href: "https://npmjs.com/package/vnstock-js",
    external: true,
  },
  {
    year: 2025,
    title: "mindmap renderer",
    role: "solo",
    stack: ["React"],
    href: "/mindmap",
    type: "experiment",
  },
];

describe("IndexTable", () => {
  it("renders one row per entry with year and title", () => {
    render(<IndexTable entries={sample} />);
    expect(screen.getByText("vnstock-js")).toBeInTheDocument();
    expect(screen.getByText("mindmap renderer")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
  });

  it("renders type prefix when entry has a type", () => {
    render(<IndexTable entries={sample} />);
    expect(screen.getByText("[experiment]")).toBeInTheDocument();
  });

  it("renders stack tags", () => {
    render(<IndexTable entries={sample} />);
    expect(screen.getByText(/TypeScript/)).toBeInTheDocument();
  });

  it("renders external rows as <a> with rel/target", () => {
    render(<IndexTable entries={sample} />);
    const link = screen.getByRole("link", { name: /vnstock-js/i });
    expect(link).toHaveAttribute("href", "https://npmjs.com/package/vnstock-js");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringMatching(/noopener/));
  });

  it("renders internal rows without target=_blank", () => {
    render(<IndexTable entries={sample} />);
    const link = screen.getByRole("link", { name: /mindmap renderer/i });
    expect(link).not.toHaveAttribute("target");
  });
});
