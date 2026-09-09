const LANGUAGE_PREFIX = "language-";
const DONE = "data-highlighted";

/**
 * Colours the code blocks in already-rendered post markup.
 *
 * Editor-authored posts are stored as an HTML string with no highlighting in
 * it, so unlike MDX — which is highlighted at build time by rehype-prism-plus —
 * there is nowhere earlier than the browser to do this. The token classes are
 * Prism's either way, so both paths land on the same `app/syntax.css`.
 *
 * refractor is imported dynamically and only once a highlightable block is
 * actually on the page: it carries a grammar per language, and a reader opening
 * a post with no code should not pay for any of them.
 */
export async function highlightCodeIn(root: ParentNode): Promise<void> {
  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>(`pre > code[class*="${LANGUAGE_PREFIX}"]`),
  ).filter((el) => !el.hasAttribute(DONE));
  if (blocks.length === 0) return;

  const { tokenize, resolveLanguage } = await import("./code-highlight");

  for (const el of blocks) {
    // Marked either way. A block whose language has no grammar must not be
    // re-examined on every pass, and the attribute is also what stops a second
    // run from tokenising output that is already tokens.
    el.setAttribute(DONE, "");

    const language =
      Array.from(el.classList)
        .find((name) => name.startsWith(LANGUAGE_PREFIX))
        ?.slice(LANGUAGE_PREFIX.length) ?? null;
    if (!resolveLanguage(language)) continue;

    const code = el.textContent ?? "";
    const fragment = document.createDocumentFragment();
    for (const token of tokenize(code, language)) {
      if (token.classes.length === 0) {
        fragment.append(document.createTextNode(token.text));
        continue;
      }
      const span = document.createElement("span");
      span.className = token.classes.join(" ");
      span.textContent = token.text;
      fragment.append(span);
    }
    el.replaceChildren(fragment);
  }
}
