import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BlogIndex } from "@/app/blog/components/blog-index";
import type { IndexEntry } from "@/components/portfolio/IndexTable";

function entry(title: string, tags: string[] = []): IndexEntry {
  return {
    year: "Jan 4",
    groupYear: 2026,
    title,
    href: `/blog/${title}`,
    tags,
  };
}

const entries: IndexEntry[] = [
  entry("aws lambda cold start", ["aws"]),
  entry("jvm memory model", ["java"]),
  entry("terraform state", ["aws", "devops"]),
];

beforeEach(() => {
  window.history.replaceState(null, "", "/blog");
});

describe("BlogIndex tag filter", () => {
  it("offers one chip per distinct tag, with a count", () => {
    render(<BlogIndex entries={entries} />);
    expect(screen.getByRole("button", { name: "aws 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "java 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "devops 1" })).toBeInTheDocument();
  });

  it("narrows the list to posts carrying the clicked tag", () => {
    render(<BlogIndex entries={entries} />);

    fireEvent.click(screen.getByRole("button", { name: "aws 2" }));

    expect(screen.getByText("aws lambda cold start")).toBeInTheDocument();
    expect(screen.getByText("terraform state")).toBeInTheDocument();
    expect(screen.queryByText("jvm memory model")).not.toBeInTheDocument();
  });

  it("clears the filter when the active chip is clicked again", () => {
    render(<BlogIndex entries={entries} />);

    const aws = screen.getByRole("button", { name: "aws 2" });
    fireEvent.click(aws);
    fireEvent.click(aws);

    expect(screen.getByText("jvm memory model")).toBeInTheDocument();
  });

  it("puts the active tag in the URL so the filtered view is linkable", () => {
    render(<BlogIndex entries={entries} />);

    fireEvent.click(screen.getByRole("button", { name: "java 1" }));
    expect(window.location.search).toBe("?tag=java");

    fireEvent.click(screen.getByRole("button", { name: "java 1" }));
    expect(window.location.search).toBe("");
  });

  it("applies a tag from the URL on first load", () => {
    window.history.replaceState(null, "", "/blog?tag=java");
    render(<BlogIndex entries={entries} />);

    expect(screen.getByText("jvm memory model")).toBeInTheDocument();
    expect(screen.queryByText("aws lambda cold start")).not.toBeInTheDocument();
  });

  it("marks the active chip with aria-pressed", () => {
    render(<BlogIndex entries={entries} />);

    const aws = screen.getByRole("button", { name: "aws 2" });
    expect(aws).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(aws);
    expect(aws).toHaveAttribute("aria-pressed", "true");
  });

  it("renders no filter bar when nothing is tagged", () => {
    render(<BlogIndex entries={[entry("untagged post")]} />);
    expect(screen.queryByRole("group", { name: /lọc theo tag/i })).not.toBeInTheDocument();
  });
});
