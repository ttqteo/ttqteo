import { refractor } from "refractor/core";
import bash from "refractor/bash";
import c from "refractor/c";
import cpp from "refractor/cpp";
import csharp from "refractor/csharp";
import css from "refractor/css";
import diff from "refractor/diff";
import docker from "refractor/docker";
import go from "refractor/go";
import java from "refractor/java";
import javascript from "refractor/javascript";
import json from "refractor/json";
import kotlin from "refractor/kotlin";
import markdown from "refractor/markdown";
import markup from "refractor/markup";
import php from "refractor/php";
import python from "refractor/python";
import ruby from "refractor/ruby";
import rust from "refractor/rust";
import sql from "refractor/sql";
import tsx from "refractor/tsx";
import typescript from "refractor/typescript";
import yaml from "refractor/yaml";

/**
 * Syntax highlighting for editor-authored code.
 *
 * Prism, via refractor, rather than a second highlighter: MDX posts already go
 * through `rehype-prism-plus`, and `app/syntax.css` styles the token classes it
 * emits. Anything else would mean a second palette to keep in step with the
 * first.
 *
 * Only the languages the editor's picker offers are registered — the full set
 * is several hundred kilobytes and every one of them would ship.
 */
for (const language of [
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  docker,
  go,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  markup,
  php,
  python,
  ruby,
  rust,
  sql,
  tsx,
  typescript,
  yaml,
]) {
  refractor.register(language);
}

/**
 * Picker values that Prism knows under another name. `mermaid` is deliberately
 * absent: it renders as a diagram, and highlighting it as source would be
 * highlighting something the reader never sees.
 */
const ALIASES: Record<string, string> = {
  html: "markup",
  dockerfile: "docker",
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  "c++": "cpp",
  "c#": "csharp",
};

/** The Prism name for a `language-*` class, or null when there is no highlighting to do. */
export function resolveLanguage(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  const name = ALIASES[value] ?? value;
  return refractor.registered(name) ? name : null;
}

/** One run of characters that share a set of token classes. */
export type Token = { text: string; classes: string[] };

type HastNode = {
  type: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
};

function collect(nodes: HastNode[], inherited: string[], out: Token[]): void {
  for (const node of nodes) {
    if (node.type === "text") {
      if (node.value) out.push({ text: node.value, classes: inherited });
      continue;
    }
    const own = node.properties?.className;
    const classes = Array.isArray(own)
      ? [...inherited, ...own.map(String)]
      : inherited;
    collect(node.children ?? [], classes, out);
  }
}

/**
 * Flattens Prism's nested output into a left-to-right run of tokens.
 *
 * Nesting is what makes this necessary: a token inside a token carries both
 * classes, and both matter to the stylesheet. Returning a flat list keeps the
 * callers — a ProseMirror decoration set and an HTML rewrite — from each having
 * to walk a tree.
 */
export function tokenize(code: string, language: string | null): Token[] {
  const name = resolveLanguage(language);
  if (!name || !code) return [{ text: code, classes: [] }];
  try {
    const tree = refractor.highlight(code, name) as unknown as HastNode;
    const out: Token[] = [];
    collect(tree.children ?? [], [], out);
    // A grammar that matches nothing returns an empty tree; the code still has
    // to come back or the block would render blank.
    return out.length ? out : [{ text: code, classes: [] }];
  } catch {
    // An unregistered or broken grammar must not take the post down with it.
    return [{ text: code, classes: [] }];
  }
}
