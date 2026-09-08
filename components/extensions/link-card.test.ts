import { generateHTML, generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { LinkCard } from "./link-card";

const extensions = [StarterKit, LinkCard];

type Attrs = Record<string, unknown>;

const doc = (attrs: Attrs) => ({
  type: "doc",
  content: [{ type: "linkCard", attrs }],
});

const FULL: Attrs = {
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  mode: "bookmark",
  title: "DHH: How to Build a Profitable Company",
  description: "A conversation about staying independent.",
  image: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  favicon: "https://www.youtube.com/favicon.ico",
  embedSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
};

function nodes(html: string) {
  return (generateJSON(html, extensions) as { content: { type: string; attrs: Attrs }[] })
    .content;
}

describe("bookmark mode", () => {
  it("renders the card as an anchor with the metadata visible", () => {
    const html = generateHTML(doc(FULL), extensions);
    expect(html).toContain('data-link-card="bookmark"');
    expect(html).toContain('href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("DHH: How to Build a Profitable Company");
    expect(html).toContain("A conversation about staying independent.");
  });

  it("puts the thumbnail last in the markup, after the text", () => {
    // Reordered visually by CSS. A screen reader should reach the title first.
    const html = generateHTML(doc(FULL), extensions);
    expect(html.indexOf("link-card-body")).toBeLessThan(html.indexOf("link-card-thumb"));
  });

  it("collapses missing fields instead of leaving empty elements", () => {
    const html = generateHTML(
      doc({ url: "https://example.test/x", mode: "bookmark" }),
      extensions,
    );
    expect(html).not.toContain("link-card-title");
    expect(html).not.toContain("link-card-desc");
    expect(html).not.toContain("link-card-thumb");
    expect(html).not.toContain("link-card-favicon");
    // A card with only a URL is a valid outcome, not a failure.
    expect(html).toContain("link-card-url");
  });

  it("carries no Tailwind utility classes", () => {
    // Tailwind never scans the database, so utilities inside stored post HTML
    // get no CSS generated and the card collapses in production.
    const classes = [...generateHTML(doc(FULL), extensions).matchAll(/class="([^"]*)"/g)]
      .flatMap((match) => match[1].split(/\s+/))
      .filter(Boolean);
    expect([...new Set(classes)].sort()).toEqual([
      "link-card",
      "link-card-body",
      "link-card-desc",
      "link-card-favicon",
      "link-card-meta",
      "link-card-thumb",
      "link-card-title",
      "link-card-url",
    ]);
  });
});

describe("embed mode", () => {
  it("renders a lazy iframe from the stored src", () => {
    const html = generateHTML(doc({ ...FULL, mode: "embed" }), extensions);
    expect(html).toContain('data-link-card="embed"');
    expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('loading="lazy"');
  });

  it("falls back to a bookmark when there is no embed src to use", () => {
    const html = generateHTML(
      doc({ ...FULL, mode: "embed", embedSrc: null }),
      extensions,
    );
    expect(html).toContain('data-link-card="bookmark"');
  });
});

describe("round-trip", () => {
  // The failure this guards against is silent: if parseHTML stops matching what
  // renderHTML wrote, reopening a post drops every card, and the next save
  // makes that permanent.
  it("reads a full bookmark back with identical attributes", () => {
    const parsed = nodes(generateHTML(doc(FULL), extensions));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("linkCard");
    expect(parsed[0].attrs).toMatchObject(FULL);
  });

  it("reads an embed back with identical attributes", () => {
    const attrs = { ...FULL, mode: "embed" };
    expect(nodes(generateHTML(doc(attrs), extensions))[0].attrs).toMatchObject(attrs);
  });

  it("round-trips a card whose optional fields are all null", () => {
    const bare: Attrs = {
      url: "https://example.test/x",
      mode: "bookmark",
      title: null,
      description: null,
      image: null,
      favicon: null,
      embedSrc: null,
    };
    expect(nodes(generateHTML(doc(bare), extensions))[0].attrs).toMatchObject(bare);
  });

  it("survives a second render/parse cycle unchanged", () => {
    const once = generateHTML(doc(FULL), extensions);
    const twice = generateHTML(generateJSON(once, extensions), extensions);
    expect(twice).toBe(once);
  });

  it("keeps the embed src on a bookmark, so switching modes does not lose it", () => {
    const parsed = nodes(generateHTML(doc(FULL), extensions))[0];
    expect(parsed.attrs.embedSrc).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });
});

describe("legacy content", () => {
  // Posts saved by the embed-only first cut carry this shape. Dropping it would
  // silently blank the players already sitting in published posts.
  const legacy = '<div class="yt-embed" data-youtube-id="dQw4w9WgXcQ"></div>';

  it("upgrades a stored yt-embed to an embed-mode card", () => {
    const parsed = nodes(legacy);
    expect(parsed[0].type).toBe("linkCard");
    expect(parsed[0].attrs).toMatchObject({
      mode: "embed",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedSrc: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("keeps a legacy start offset", () => {
    const parsed = nodes(
      '<div class="yt-embed" data-youtube-id="dQw4w9WgXcQ" data-start="90"></div>',
    );
    expect(parsed[0].attrs.embedSrc).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90",
    );
  });

  it("re-renders the upgraded card in the current format", () => {
    const html = generateHTML(generateJSON(legacy, extensions), extensions);
    expect(html).toContain('data-link-card="embed"');
    expect(html).not.toContain("data-youtube-id");
  });

  it("leaves an unrelated div alone", () => {
    expect(nodes("<div><p>chỉ là đoạn văn</p></div>").every((n) => n.type !== "linkCard")).toBe(
      true,
    );
  });
});
