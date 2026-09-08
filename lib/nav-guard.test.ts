import { describe, expect, it } from "vitest";
import { navigationTarget, type ClickModifiers } from "./nav-guard";

const HERE = "http://localhost:3000/admin/edit/abc123";

const PLAIN_CLICK: ClickModifiers = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

function anchor(html: string): HTMLAnchorElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.querySelector("a") as HTMLAnchorElement;
}

describe("navigationTarget", () => {
  it("catches a plain click to another in-app page", () => {
    expect(navigationTarget(anchor('<a href="/admin">back</a>'), HERE, PLAIN_CLICK)).toBe(
      "/admin",
    );
  });

  it("keeps the query string", () => {
    expect(
      navigationTarget(anchor('<a href="/admin?filter=draft">x</a>'), HERE, PLAIN_CLICK),
    ).toBe("/admin?filter=draft");
  });

  it("resolves a relative href against the current page", () => {
    expect(navigationTarget(anchor('<a href="../new">x</a>'), HERE, PLAIN_CLICK)).toBe(
      "/admin/new",
    );
  });

  it("catches an absolute URL back to the same origin", () => {
    expect(
      navigationTarget(anchor('<a href="http://localhost:3000/blog">x</a>'), HERE, PLAIN_CLICK),
    ).toBe("/blog");
  });

  describe("ignores", () => {
    it("modified clicks, which open somewhere else", () => {
      for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
        expect(
          navigationTarget(anchor('<a href="/admin">x</a>'), HERE, {
            ...PLAIN_CLICK,
            [key]: true,
          }),
        ).toBeNull();
      }
    });

    it("middle click", () => {
      expect(
        navigationTarget(anchor('<a href="/admin">x</a>'), HERE, {
          ...PLAIN_CLICK,
          button: 1,
        }),
      ).toBeNull();
    });

    it("links that open a new tab", () => {
      expect(
        navigationTarget(
          anchor('<a href="/admin" target="_blank">x</a>'),
          HERE,
          PLAIN_CLICK,
        ),
      ).toBeNull();
    });

    it("downloads", () => {
      expect(
        navigationTarget(anchor('<a href="/file.pdf" download>x</a>'), HERE, PLAIN_CLICK),
      ).toBeNull();
    });

    it("other origins — the browser's own prompt covers those", () => {
      expect(
        navigationTarget(anchor('<a href="https://youtube.com">x</a>'), HERE, PLAIN_CLICK),
      ).toBeNull();
    });

    it("non-http protocols", () => {
      for (const href of ["mailto:a@b.test", "tel:123", "javascript:void(0)"]) {
        expect(navigationTarget(anchor(`<a href="${href}">x</a>`), HERE, PLAIN_CLICK)).toBeNull();
      }
    });

    it("in-page anchors and same-path links", () => {
      // A heading link inside the post being written is not leaving the editor.
      expect(navigationTarget(anchor('<a href="#toc">x</a>'), HERE, PLAIN_CLICK)).toBeNull();
      expect(
        navigationTarget(anchor('<a href="/admin/edit/abc123?v=2">x</a>'), HERE, PLAIN_CLICK),
      ).toBeNull();
    });

    it("anchors with no href at all", () => {
      expect(navigationTarget(anchor("<a>x</a>"), HERE, PLAIN_CLICK)).toBeNull();
    });
  });
});
