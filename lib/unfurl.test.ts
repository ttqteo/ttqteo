import { describe, expect, it } from "vitest";
import {
  bareUrl,
  absoluteUrl,
  decodeEntities,
  extractIframeSrc,
  faviconHref,
  isBlockedAddress,
  isBlockedHostname,
  mergeUnfurl,
  metaContent,
  parseOpenGraph,
  providerFor,
  titleTag,
} from "./unfurl";

const BASE = "https://example.test/a/b";

describe("decodeEntities", () => {
  it("decodes the named entities that show up in titles", () => {
    expect(decodeEntities("Tom &amp; Jerry &quot;live&quot; &lt;3")).toBe(
      'Tom & Jerry "live" <3',
    );
  });

  it("decodes numeric and hex references", () => {
    expect(decodeEntities("it&#39;s &#x27;quoted&#x27;")).toBe("it's 'quoted'");
  });

  it("leaves unknown entities alone rather than eating them", () => {
    expect(decodeEntities("a &nope; b")).toBe("a &nope; b");
  });
});

describe("metaContent", () => {
  it("reads a property meta", () => {
    expect(metaContent('<meta property="og:title" content="Hello">', "og:title")).toBe(
      "Hello",
    );
  });

  it("reads a name meta", () => {
    expect(metaContent('<meta name="description" content="Hi">', "description")).toBe(
      "Hi",
    );
  });

  it("does not care about attribute order", () => {
    // Real pages put content first often enough that ordered matching breaks.
    expect(metaContent('<meta content="Hello" property="og:title">', "og:title")).toBe(
      "Hello",
    );
  });

  it("handles single quotes and extra attributes", () => {
    expect(
      metaContent(`<meta data-rh="true" property='og:title' content='Hello'>`, "og:title"),
    ).toBe("Hello");
  });

  it("decodes entities in the value", () => {
    expect(
      metaContent('<meta property="og:title" content="Tom &amp; Jerry">', "og:title"),
    ).toBe("Tom & Jerry");
  });

  it("returns null for a missing key or an empty value", () => {
    expect(metaContent("<meta property=\"og:x\" content=\"v\">", "og:title")).toBeNull();
    expect(metaContent('<meta property="og:title" content="">', "og:title")).toBeNull();
  });

  it("does not confuse a key with one that merely starts the same", () => {
    const html = '<meta property="og:image:width" content="1280">';
    expect(metaContent(html, "og:image")).toBeNull();
  });
});

describe("titleTag", () => {
  it("reads and collapses whitespace", () => {
    expect(titleTag("<title>\n  Hello   world\n</title>")).toBe("Hello world");
  });

  it("returns null when there is none", () => {
    expect(titleTag("<html><body>x</body></html>")).toBeNull();
  });
});

describe("absoluteUrl", () => {
  it("resolves a relative path against the page", () => {
    expect(absoluteUrl("/img.png", BASE)).toBe("https://example.test/img.png");
    expect(absoluteUrl("c.png", BASE)).toBe("https://example.test/a/c.png");
  });

  it("passes an absolute URL through", () => {
    expect(absoluteUrl("https://cdn.test/x.png", BASE)).toBe("https://cdn.test/x.png");
  });

  it("rejects non-http schemes and empty values", () => {
    expect(absoluteUrl("javascript:alert(1)", BASE)).toBeNull();
    expect(absoluteUrl("data:image/png;base64,AAA", BASE)).toBeNull();
    expect(absoluteUrl(null, BASE)).toBeNull();
  });
});

describe("faviconHref", () => {
  it("prefers rel=icon and makes it absolute", () => {
    expect(faviconHref('<link rel="icon" href="/fav.png">', BASE)).toBe(
      "https://example.test/fav.png",
    );
  });

  it("falls back through shortcut and apple-touch-icon", () => {
    expect(faviconHref('<link rel="shortcut icon" href="/s.ico">', BASE)).toBe(
      "https://example.test/s.ico",
    );
    expect(faviconHref('<link rel="apple-touch-icon" href="/a.png">', BASE)).toBe(
      "https://example.test/a.png",
    );
  });

  it("falls back to /favicon.ico when the page declares none", () => {
    expect(faviconHref("<html></html>", BASE)).toBe("https://example.test/favicon.ico");
  });

  it("ignores stylesheet links", () => {
    expect(faviconHref('<link rel="stylesheet" href="/x.css">', BASE)).toBe(
      "https://example.test/favicon.ico",
    );
  });
});

describe("parseOpenGraph", () => {
  it("reads the OG block", () => {
    const html = `
      <meta property="og:title" content="A title">
      <meta property="og:description" content="A description">
      <meta property="og:image" content="/img.png">
      <meta property="og:site_name" content="Example">`;
    expect(parseOpenGraph(html, BASE)).toEqual({
      title: "A title",
      description: "A description",
      image: "https://example.test/img.png",
      siteName: "Example",
    });
  });

  it("falls back to twitter card tags", () => {
    const html = `
      <meta name="twitter:title" content="T">
      <meta name="twitter:description" content="D">
      <meta name="twitter:image" content="https://cdn.test/i.png">`;
    expect(parseOpenGraph(html, BASE)).toMatchObject({
      title: "T",
      description: "D",
      image: "https://cdn.test/i.png",
    });
  });

  it("returns nulls for a page with no metadata at all", () => {
    expect(parseOpenGraph("<html><body>hi</body></html>", BASE)).toEqual({
      title: null,
      description: null,
      image: null,
      siteName: null,
    });
  });
});

describe("extractIframeSrc", () => {
  it("pulls the src out of a provider's embed html", () => {
    expect(
      extractIframeSrc(
        '<iframe width="200" src="https://www.youtube.com/embed/abc" allowfullscreen></iframe>',
      ),
    ).toBe("https://www.youtube.com/embed/abc");
  });

  it("decodes entities in the src", () => {
    expect(extractIframeSrc('<iframe src="https://x.test/e?a=1&amp;b=2"></iframe>')).toBe(
      "https://x.test/e?a=1&b=2",
    );
  });

  it("refuses a non-http src and missing html", () => {
    expect(extractIframeSrc('<iframe src="/relative"></iframe>')).toBeNull();
    expect(extractIframeSrc("<div>no iframe</div>")).toBeNull();
    expect(extractIframeSrc(null)).toBeNull();
  });
});

describe("mergeUnfurl", () => {
  const provider = { name: "YouTube", hosts: /./, oembed: () => "", embeddable: true };

  // The precedence table from the spec, verified against a real YouTube URL:
  // title from oEmbed, description only from OG, image from OG (higher res).
  it("takes the title from oEmbed over OG", () => {
    const result = mergeUnfurl({
      url: "https://youtu.be/abc",
      oembed: { title: "oEmbed title" },
      og: { title: "OG title", description: null, image: null, siteName: null },
    });
    expect(result.title).toBe("oEmbed title");
  });

  it("takes the description from OG, the only source of one", () => {
    const result = mergeUnfurl({
      url: "https://youtu.be/abc",
      oembed: { title: "t" },
      og: { title: null, description: "OG description", image: null, siteName: null },
    });
    expect(result.description).toBe("OG description");
  });

  it("prefers the OG image over the oEmbed thumbnail", () => {
    const result = mergeUnfurl({
      url: "https://youtu.be/abc",
      oembed: { thumbnail_url: "https://i.test/hq.jpg" },
      og: {
        title: null,
        description: null,
        image: "https://i.test/maxres.jpg",
        siteName: null,
      },
    });
    expect(result.image).toBe("https://i.test/maxres.jpg");
  });

  it("uses the oEmbed thumbnail when OG has no image", () => {
    const result = mergeUnfurl({
      url: "https://youtu.be/abc",
      oembed: { thumbnail_url: "https://i.test/hq.jpg" },
      og: { title: null, description: null, image: null, siteName: null },
    });
    expect(result.image).toBe("https://i.test/hq.jpg");
  });

  it("falls back to the <title> tag when neither source has one", () => {
    const result = mergeUnfurl({
      url: "https://example.test/x",
      titleFallback: "Plain title",
    });
    expect(result.title).toBe("Plain title");
  });

  it("degrades to url plus hostname with nothing else available", () => {
    const result = mergeUnfurl({ url: "https://www.example.test/x" });
    expect(result).toMatchObject({
      title: null,
      description: null,
      image: null,
      siteName: "example.test",
      embedSrc: null,
      embeddable: false,
    });
  });

  it("offers embed only when the provider allows it and an iframe was found", () => {
    const withIframe = mergeUnfurl({
      url: "https://youtu.be/abc",
      oembed: { html: '<iframe src="https://www.youtube.com/embed/abc"></iframe>' },
      provider,
    });
    expect(withIframe).toMatchObject({
      embedSrc: "https://www.youtube.com/embed/abc",
      embeddable: true,
    });

    // A provider that says embeddable but returned no iframe must not offer it.
    expect(mergeUnfurl({ url: "https://youtu.be/abc", provider }).embeddable).toBe(false);

    // An embeddable iframe from a provider not on the allowlist is not offered.
    expect(
      mergeUnfurl({
        url: "https://other.test/x",
        oembed: { html: '<iframe src="https://other.test/e"></iframe>' },
      }).embeddable,
    ).toBe(false);
  });
});

describe("providerFor", () => {
  it("matches the YouTube hosts", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=abc",
      "https://youtu.be/abc",
      "https://m.youtube.com/watch?v=abc",
      "https://music.youtube.com/watch?v=abc",
    ]) {
      expect(providerFor(url)?.name).toBe("YouTube");
    }
  });

  it("does not match a lookalike host", () => {
    expect(providerFor("https://notyoutube.com/watch?v=abc")).toBeNull();
    expect(providerFor("https://youtube.com.evil.test/watch?v=abc")).toBeNull();
  });

  it("returns null for an unknown provider and for junk", () => {
    expect(providerFor("https://example.test/x")).toBeNull();
    expect(providerFor("not a url")).toBeNull();
  });
});

describe("isBlockedAddress", () => {
  it("blocks loopback, link-local and RFC1918", () => {
    for (const ip of [
      "127.0.0.1",
      "127.1.2.3",
      "0.0.0.0",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "224.0.0.1",
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it("blocks the IPv6 equivalents", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it("allows ordinary public addresses", () => {
    for (const ip of ["8.8.8.8", "172.32.0.1", "192.169.0.1", "2606:4700::1111"]) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it("refuses anything it cannot read as an address", () => {
    expect(isBlockedAddress("")).toBe(true);
    expect(isBlockedAddress("999.1.1.1")).toBe(true);
    expect(isBlockedAddress("1.2.3")).toBe(true);
  });
});

describe("isBlockedHostname", () => {
  it("blocks local names before DNS is consulted", () => {
    for (const host of ["localhost", "api.localhost", "printer.local", "db.internal"]) {
      expect(isBlockedHostname(host), host).toBe(true);
    }
  });

  it("blocks a literal private address in the URL", () => {
    expect(isBlockedHostname("169.254.169.254")).toBe(true);
    expect(isBlockedHostname("[::1]")).toBe(true);
  });

  it("allows an ordinary public hostname", () => {
    expect(isBlockedHostname("youtube.com")).toBe(false);
  });
});

describe("bareUrl", () => {
  it("accepts a URL pasted on its own", () => {
    expect(bareUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("trims surrounding whitespace", () => {
    expect(bareUrl("  https://example.test/x \n")).toBe("https://example.test/x");
  });

  it("returns the text as pasted, without normalising it", () => {
    // `new URL().toString()` would rewrite the author's URL under them.
    expect(bareUrl("https://example.test")).toBe("https://example.test");
  });

  it("rejects a paste that is more than just the URL", () => {
    expect(bareUrl("xem cái này https://youtu.be/abc hay lắm")).toBeNull();
  });

  it("rejects non-http schemes and non-URLs", () => {
    expect(bareUrl("javascript:alert(1)")).toBeNull();
    expect(bareUrl("mailto:a@b.test")).toBeNull();
    expect(bareUrl("just some prose")).toBeNull();
    expect(bareUrl("")).toBeNull();
    expect(bareUrl(null)).toBeNull();
  });
});
