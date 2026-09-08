// Via `@tiptap/react`, which re-exports all of `@tiptap/core`: core is only a
// transitive dependency here and is not resolvable as a bare specifier.
import { Node, mergeAttributes } from "@tiptap/react";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { youtubeEmbedSrc } from "@/lib/youtube";

export type LinkCardMode = "bookmark" | "embed";

/**
 * A pasted URL rendered as a bookmark card or an embedded player.
 *
 * One node with a `mode` attribute rather than two nodes. `parseHTML` is the
 * piece most likely to break, and when it misses, reopening a saved post
 * silently degrades every card back to nothing — the author only finds out
 * after saving over it. One node means one selector to keep correct, and it
 * lets a card switch modes in place instead of being deleted and re-inserted.
 *
 * Post content is stored as the string `editor.getHTML()` returns and read back
 * on the public page through `dangerouslySetInnerHTML`, so what `renderHTML`
 * emits *is* what a reader gets: no component runs on the read path. Hence the
 * semantic class names, styled in `globals.css`. Tailwind scans `.ts`/`.tsx`
 * only, so utilities living solely inside a database string get no CSS
 * generated and would collapse in production.
 *
 * Values are recovered from `data-*` attributes rather than from the card's text
 * content. Classes are a styling concern and may be renamed; the data
 * attributes are the format contract.
 */
export const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    // Every value is rendered by hand in renderHTML, so each of these returns an
    // empty object rather than letting tiptap emit a stray attribute.
    const rendered = () => ({});

    return {
      url: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const direct = element.getAttribute("data-url");
          if (direct) return direct;
          // Cards saved by the first cut of this feature, before modes existed.
          const legacy = element.getAttribute("data-youtube-id");
          return legacy ? `https://www.youtube.com/watch?v=${legacy}` : null;
        },
        renderHTML: rendered,
      },
      mode: {
        default: "bookmark",
        parseHTML: (element: HTMLElement): LinkCardMode =>
          element.getAttribute("data-link-card") === "embed" ||
          element.hasAttribute("data-youtube-id")
            ? "embed"
            : "bookmark",
        renderHTML: rendered,
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-title"),
        renderHTML: rendered,
      },
      description: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-description"),
        renderHTML: rendered,
      },
      image: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-image"),
        renderHTML: rendered,
      },
      favicon: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-favicon"),
        renderHTML: rendered,
      },
      embedSrc: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const direct = element.getAttribute("data-embed-src");
          if (direct) return direct;
          const legacy = element.getAttribute("data-youtube-id");
          if (!legacy) return null;
          const start = Number(element.getAttribute("data-start"));
          return youtubeEmbedSrc(legacy, Number.isFinite(start) ? start : null);
        },
        renderHTML: rendered,
      },
    };
  },

  parseHTML() {
    // Priority above the default 50 on purpose. A bookmark card *is* an anchor,
    // so the link mark's own `a[href]` rule matches it too, and at equal
    // priority the mark wins — the card silently flattens into underlined text
    // on the next open. Only the round-trip test catches that.
    return [
      { tag: "a[data-link-card]", priority: 60 },
      { tag: "div[data-link-card]", priority: 60 },
      // Legacy shape from the embed-only first cut; upgraded on next open.
      { tag: "div[data-youtube-id]", priority: 60 },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { url, mode, title, description, image, favicon, embedSrc } = node.attrs as {
      url: string;
      mode: LinkCardMode;
      title: string | null;
      description: string | null;
      image: string | null;
      favicon: string | null;
      embedSrc: string | null;
    };

    const data = (extra: Record<string, string | null>) =>
      Object.fromEntries(
        Object.entries(extra).filter(([, value]) => value != null),
      ) as Record<string, string>;

    if (mode === "embed" && embedSrc) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          class: "link-card-embed",
          "data-link-card": "embed",
          "data-url": url,
          "data-embed-src": embedSrc,
          ...data({
            "data-title": title,
            "data-description": description,
            "data-image": image,
            "data-favicon": favicon,
          }),
        }),
        [
          "iframe",
          {
            src: embedSrc,
            title: title ?? "Embedded content",
            // An embed high in a long post would otherwise pull the provider's
            // player bundle on first paint, for every reader, including the ones
            // who never scroll to it.
            loading: "lazy",
            frameborder: "0",
            referrerpolicy: "strict-origin-when-cross-origin",
            allow:
              "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
            allowfullscreen: "true",
          },
        ],
      ];
    }

    // Bookmark. Inline elements only inside the anchor: an <a> containing block
    // elements is invalid HTML, and the browser reparents it, which breaks
    // parseHTML on the next load.
    const meta: DOMOutputSpec[] = [];
    if (favicon) {
      meta.push(["img", { class: "link-card-favicon", src: favicon, alt: "" }]);
    }
    meta.push(["span", { class: "link-card-url" }, url]);

    const body: DOMOutputSpec[] = [];
    if (title) body.push(["span", { class: "link-card-title" }, title]);
    if (description) body.push(["span", { class: "link-card-desc" }, description]);
    body.push(["span", { class: "link-card-meta" }, ...meta] as DOMOutputSpec);

    const children: DOMOutputSpec[] = [
      ["span", { class: "link-card-body" }, ...body] as DOMOutputSpec,
    ];
    // The thumbnail is last in the markup but first visually: a screen reader
    // reaches the title before the decorative image, and CSS reorders it. Do not
    // "fix" this by moving the <img> up.
    if (image) {
      children.push([
        "img",
        { class: "link-card-thumb", src: image, alt: "", loading: "lazy" },
      ]);
    }

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        class: "link-card",
        href: url,
        target: "_blank",
        rel: "noopener noreferrer",
        "data-link-card": "bookmark",
        "data-url": url,
        ...data({
          "data-title": title,
          "data-description": description,
          "data-image": image,
          "data-favicon": favicon,
          "data-embed-src": embedSrc,
        }),
      }),
      ...children,
    ] as DOMOutputSpec;
  },
});
