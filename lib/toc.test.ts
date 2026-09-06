import { describe, expect, it } from "vitest";
import { injectHeadingIds, tocFromHtml, tocFromMarkdown } from "@/lib/toc";

describe("tocFromMarkdown", () => {
  it("collects h2 to h4 with their anchor", () => {
    const toc = tocFromMarkdown(["## Mở đầu", "### Chi tiết", "#### Ghi chú"].join("\n"));
    expect(toc).toEqual([
      { level: 2, text: "Mở đầu", href: "#mở-đầu" },
      { level: 3, text: "Chi tiết", href: "#chi-tiết" },
      { level: 4, text: "Ghi chú", href: "#ghi-chú" },
    ]);
  });

  it("ignores h1, which belongs to the page title, not the body outline", () => {
    expect(tocFromMarkdown("# 12. Dự đoán\n\n## Thật sự")).toEqual([
      { level: 2, text: "Thật sự", href: "#thật-sự" },
    ]);
  });

  it("ignores headings inside a fenced code block", () => {
    const raw = [
      "## Cấu hình",
      "",
      "```yaml",
      "# Controls when the action will run",
      "on: push",
      "```",
      "",
      "## Kết",
    ].join("\n");
    expect(tocFromMarkdown(raw).map((t) => t.text)).toEqual(["Cấu hình", "Kết"]);
  });

  it("gives repeated headings distinct anchors", () => {
    expect(tocFromMarkdown("## Ghi chú\n## Ghi chú").map((t) => t.href)).toEqual([
      "#ghi-chú",
      "#ghi-chú-1",
    ]);
  });
});

describe("tocFromHtml", () => {
  it("collects h2 to h4 and strips inline markup from the label", () => {
    const toc = tocFromHtml("<h2>Mở <strong>đầu</strong></h2><h3>Chi tiết</h3>");
    expect(toc).toEqual([
      { level: 2, text: "Mở đầu", href: "#mở-đầu" },
      { level: 3, text: "Chi tiết", href: "#chi-tiết" },
    ]);
  });

  it("skips an empty heading", () => {
    expect(tocFromHtml("<h2></h2><h2>Thật</h2>")).toHaveLength(1);
  });

  it("uses the same anchors markdown would produce for the same headings", () => {
    const headings = ["Mở đầu", "Áp lực thời đại AI", "Ghi chú"];
    const fromHtml = tocFromHtml(headings.map((h) => `<h2>${h}</h2>`).join(""));
    const fromMd = tocFromMarkdown(headings.map((h) => `## ${h}`).join("\n"));
    expect(fromHtml.map((t) => t.href)).toEqual(fromMd.map((t) => t.href));
  });
});

describe("injectHeadingIds", () => {
  it("adds an id that matches the anchor the TOC links to", () => {
    const html = "<h2>Áp lực thời đại AI</h2>";
    const withIds = injectHeadingIds(html);
    const [entry] = tocFromHtml(html);
    expect(withIds).toContain(`id="${entry.href.slice(1)}"`);
  });

  it("leaves an existing id alone", () => {
    expect(injectHeadingIds('<h2 id="custom">Mở đầu</h2>')).toContain('id="custom"');
  });

  it("keeps duplicate headings addressable with distinct ids", () => {
    const withIds = injectHeadingIds("<h2>Ghi chú</h2><h2>Ghi chú</h2>");
    expect(withIds).toContain('id="ghi-chú"');
    expect(withIds).toContain('id="ghi-chú-1"');
  });
});
