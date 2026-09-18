import { describe, expect, it } from "vitest";
import { extractLinks, linkHost, linkLabel, splitLinks } from "./note-links";

describe("extractLinks", () => {
  it("finds every http(s) URL in a note, in order, once each", () => {
    const body = [
      "free key deepseek",
      "https://www.orcarouter.ai/",
      "groq - chatgpt oss 120b",
      "https://console.groq.com/home",
      "again https://www.orcarouter.ai/ and http://example.com",
    ].join("\n");
    expect(extractLinks(body)).toEqual([
      "https://www.orcarouter.ai/",
      "https://console.groq.com/home",
      "http://example.com",
    ]);
  });

  it("leaves trailing punctuation and closing brackets out of the URL", () => {
    expect(extractLinks("xem https://a.com/x. rồi (https://b.com/y), ok")).toEqual([
      "https://a.com/x",
      "https://b.com/y",
    ]);
  });

  it("keeps a closing bracket that the URL itself opened", () => {
    expect(extractLinks("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([
      "https://en.wikipedia.org/wiki/Foo_(bar)",
    ]);
  });

  it("ignores other schemes and bare domains", () => {
    expect(extractLinks("ftp://x.com mailto:a@b.com orcarouter.ai")).toEqual([]);
  });

  it("returns nothing for a note without links", () => {
    expect(extractLinks("harness")).toEqual([]);
  });
});

describe("linkLabel", () => {
  it("shows the host without www and the path without a trailing slash", () => {
    expect(linkLabel("https://www.orcarouter.ai/")).toBe("orcarouter.ai");
    expect(linkLabel("https://console.groq.com/home")).toBe("console.groq.com/home");
  });

  it("drops the query string and fragment", () => {
    expect(
      linkLabel(
        "https://www.omelet.tech/deepseek-v4-1-trieu-token-context-canh-bac-kien-truc/?fbclid=IwY2xjawRcl#top",
      ),
    ).toBe("omelet.tech/deepseek-v4-1-trieu-token-context-canh-bac-kien-truc");
  });

  it("decodes percent-encoded paths so Vietnamese slugs read as text", () => {
    expect(linkLabel("https://vi.wikipedia.org/wiki/H%C3%A0_N%E1%BB%99i")).toBe(
      "vi.wikipedia.org/wiki/Hà_Nội",
    );
  });

  it("returns something unparseable as it is", () => {
    expect(linkLabel("https://")).toBe("https://");
  });
});

describe("linkHost", () => {
  it("gives the site alone, without www", () => {
    expect(linkHost("https://www.omelet.tech/deepseek-v4?x=1")).toBe("omelet.tech");
    expect(linkHost("https://youtu.be/dQw4w9WgXcQ")).toBe("youtu.be");
    expect(linkHost("https://")).toBe("https://");
  });
});

describe("splitLinks", () => {
  it("splits a line into text and link parts", () => {
    expect(splitLinks("đọc https://a.com rồi https://b.com/x.")).toEqual([
      { kind: "text", text: "đọc " },
      { kind: "link", url: "https://a.com" },
      { kind: "text", text: " rồi " },
      { kind: "link", url: "https://b.com/x" },
      { kind: "text", text: "." },
    ]);
  });

  it("returns one text part for a line without links", () => {
    expect(splitLinks("harness")).toEqual([{ kind: "text", text: "harness" }]);
  });

  it("returns only the link for a line that is a URL", () => {
    expect(splitLinks("https://a.com")).toEqual([{ kind: "link", url: "https://a.com" }]);
  });
});
