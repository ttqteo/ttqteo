import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SheetLeftbar } from "@/components/leftbar";

describe("SheetLeftbar trigger", () => {
  it("is a button labelled menu", () => {
    render(<SheetLeftbar />);
    expect(screen.getByRole("button", { name: "menu" })).toBeInTheDocument();
  });

  /**
   * Regression: the trigger used `size="icon"`, a fixed 36x36 box, while
   * holding a `text-2xl` word plus `mr-8`. The base button centres and never
   * wraps, so ~100px of content overflowed a 36px box on both sides and painted
   * over the theme toggle sitting 4px to its left. happy-dom computes no
   * layout, so the invariant we can hold onto here is the sizing itself: a
   * text trigger must be free to grow to its label.
   */
  it("does not pin itself to a fixed icon-sized box", () => {
    render(<SheetLeftbar />);
    const trigger = screen.getByRole("button", { name: "menu" });
    expect(trigger.className).not.toMatch(/(^|\s)w-9(\s|$)/);
  });

  it("does not push its label sideways with a stray margin", () => {
    render(<SheetLeftbar />);
    const label = screen.getByText("menu");
    expect(label.className).not.toMatch(/(^|\s)mr-8(\s|$)/);
  });
});
