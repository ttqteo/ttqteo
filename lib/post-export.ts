import { languageOf } from "@/lib/mermaid";
import { PRIVATE_NOTE_ATTR } from "@/lib/private-note";

/**
 * Chuyển HTML của bài (thứ `editor.getHTML()` lưu trong `blogs.content`) sang
 * Markdown hoặc text thuần, cho nút copy trên trang soạn.
 *
 * Đi trên DOM chứ không qua schema của tiptap: nút nằm ở header trang soạn, và
 * header không nên kéo cả tiptap vào chunk của nó (editor được tách chunk riêng
 * vì nặng). HTML ở đây luôn do editor sinh ra, nên hình dạng từng khối là biết
 * trước. Cần `DOMParser`, tức chỉ chạy trên trình duyệt.
 */

export type PostExportInput = { title: string; description: string; content: string };

type Mode = "markdown" | "text";

/** Một khối đã chuyển xong. Cờ `list` để list lồng nối sát vào mục chứa nó. */
type Block = { text: string; list: boolean };

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Kiểu callout của editor sang tên GitHub alert. `danger` không có tên riêng bên đó. */
const CALLOUT_ALERT: Record<string, string> = {
  note: "NOTE",
  tip: "TIP",
  warning: "WARNING",
  danger: "CAUTION",
};

const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "PRE",
  "HR",
  "TABLE",
  "DIV",
  "ASIDE",
  "SECTION",
  "FIGURE",
  "IFRAME",
]);

export function htmlToMarkdown(html: string): string {
  return render(html, "markdown");
}

export function htmlToText(html: string): string {
  return render(html, "text");
}

export function postToMarkdown({ title, description, content }: PostExportInput): string {
  const parts: string[] = [];
  const heading = title.trim();
  if (heading) parts.push(`# ${escapeInline(heading)}`);
  const lead = description.trim();
  if (lead) parts.push(escapeLines(escapeInline(lead)));
  const body = htmlToMarkdown(content);
  if (body) parts.push(body);
  return parts.join("\n\n");
}

export function postToText({ title, description, content }: PostExportInput): string {
  return [title.trim(), description.trim(), htmlToText(content)].filter(Boolean).join("\n\n");
}

function render(html: string, mode: Mode): string {
  if (!html.trim()) return "";
  const body = new DOMParser().parseFromString(html, "text/html").body;
  return joinBlocks(blocksOf(body, mode));
}

function joinBlocks(blocks: Block[]): string {
  return blocks.map((block) => block.text).join("\n\n");
}

function isBlock(el: Element): boolean {
  return (
    BLOCK_TAGS.has(el.tagName) ||
    // Bookmark là một `<a>`, nhưng đứng riêng một khối chứ không nằm trong câu.
    el.hasAttribute("data-link-card") ||
    el.hasAttribute("data-youtube-id")
  );
}

/**
 * Các khối con của `parent`. Chữ nằm trần giữa các khối (một `<img>` ở gốc,
 * hay chữ trong một ô bảng không bọc `<p>`) được gom thành một đoạn.
 */
function blocksOf(parent: Element, mode: Mode): Block[] {
  const blocks: Block[] = [];
  let loose: Node[] = [];
  const flush = () => {
    const text = paragraph(inlineOf(loose, mode), mode);
    if (text) blocks.push({ text, list: false });
    loose = [];
  };

  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === ELEMENT_NODE && isBlock(child as Element)) {
      flush();
      const block = blockOf(child as Element, mode);
      if (block?.text) blocks.push(block);
    } else {
      loose.push(child);
    }
  }
  flush();
  return blocks;
}

function blockOf(el: Element, mode: Mode): Block | null {
  // Bước cắt trên server không chạy ở đây, nên tự bỏ, kể cả ghi chú nằm lồng
  // trong callout hay trong list.
  if (el.hasAttribute(PRIVATE_NOTE_ATTR)) return null;
  if (el.hasAttribute("data-link-card") || el.hasAttribute("data-youtube-id")) {
    return other(linkCard(el, mode));
  }
  if (el.hasAttribute("data-callout")) return other(callout(el, mode));

  const tag = el.tagName;
  if (/^H[1-6]$/.test(tag)) return other(heading(el, mode));

  switch (tag) {
    case "P":
      return other(paragraph(inlineOf(el.childNodes, mode), mode));
    case "UL":
    case "OL":
      return { text: list(el, mode), list: true };
    case "BLOCKQUOTE":
      return other(quote(joinBlocks(blocksOf(el, mode)), mode));
    case "PRE":
      return other(codeBlock(el, mode));
    case "HR":
      return other("---");
    case "TABLE":
      return other(table(el, mode));
    case "IFRAME":
      return null;
    default:
      // Vỏ không mang nghĩa gì, như `div.tableWrapper`.
      return other(joinBlocks(blocksOf(el, mode)));
  }
}

function other(text: string): Block {
  return { text, list: false };
}

function paragraph(raw: string, mode: Mode): string {
  if (mode === "text") return raw.trim();
  // Một `<br>` ở mép đoạn thành dấu `\` treo ở cuối, và Markdown đọc nó như chữ.
  return escapeLines(raw.replace(/^(?:\s|\\\n)+|(?:\s|\\\n)+$/g, ""));
}

function heading(el: Element, mode: Mode): string {
  const text = paragraph(inlineOf(el.childNodes, mode), mode);
  if (!text || mode === "text") return text;
  // Tiêu đề ATX chỉ nằm trên một dòng.
  return `${"#".repeat(Number(el.tagName[1]))} ${text.replace(/\\\n/g, " ")}`;
}

function list(el: Element, mode: Mode): string {
  const ordered = el.tagName === "OL";
  let number = ordered ? Number.parseInt(el.getAttribute("start") ?? "1", 10) : 0;
  if (!Number.isFinite(number)) number = 1;

  const items: string[] = [];
  for (const item of Array.from(el.children)) {
    if (item.tagName !== "LI") continue;
    const marker = ordered ? `${number++}. ` : "- ";
    let body = "";
    blocksOf(item, mode).forEach((block, index) => {
      if (index > 0) body += block.list ? "\n" : "\n\n";
      body += block.text;
    });
    items.push(`${marker}${indent(body, " ".repeat(marker.length))}`.trimEnd());
  }
  return items.join("\n");
}

/** Thụt mọi dòng trừ dòng đầu, để phần sau của một mục vẫn thuộc về mục đó. */
function indent(text: string, pad: string): string {
  return text
    .split("\n")
    .map((line, index) => (index === 0 || line === "" ? line : pad + line))
    .join("\n");
}

function quote(text: string, mode: Mode): string {
  if (!text || mode === "text") return text;
  return text
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function callout(el: Element, mode: Mode): string {
  const body = joinBlocks(blocksOf(el, mode));
  if (!body || mode === "text") return body;
  const alert = CALLOUT_ALERT[el.getAttribute("data-callout") ?? ""] ?? "NOTE";
  return `> [!${alert}]\n${quote(body, mode)}`;
}

function codeBlock(pre: Element, mode: Mode): string {
  const code = pre.querySelector("code");
  const source = ((code ?? pre).textContent ?? "").replace(/\n$/, "");
  if (!source || mode === "text") return source;
  const language = languageOf(pre) ?? "";
  const fence = "`".repeat(Math.max(3, longestRun(source, "`") + 1));
  return `${fence}${language}\n${source}\n${fence}`;
}

function table(el: Element, mode: Mode): string {
  const rows = rowsOf(el).map((row) => {
    const cells: string[] = [];
    for (const cell of Array.from(row.children)) {
      if (cell.tagName !== "TD" && cell.tagName !== "TH") continue;
      cells.push(cellText(cell, mode));
      // Ô gộp không có trong Markdown: giữ đủ số cột bằng ô trống.
      const span = Number.parseInt(cell.getAttribute("colspan") ?? "1", 10);
      for (let i = 1; i < span; i += 1) cells.push("");
    }
    return cells;
  });

  const width = Math.max(0, ...rows.map((row) => row.length));
  if (width === 0) return "";
  const padded = rows.map((row) => [...row, ...Array<string>(width - row.length).fill("")]);

  if (mode === "text") return padded.map((row) => row.join("\t")).join("\n");

  // GFM bắt buộc có hàng tiêu đề, nên hàng đầu luôn làm tiêu đề, kể cả khi
  // trong editor nó là ô thường.
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(padded[0]), line(padded[0].map(() => "---")), ...padded.slice(1).map(line)].join(
    "\n",
  );
}

function rowsOf(table: Element): Element[] {
  const rows: Element[] = [];
  for (const child of Array.from(table.children)) {
    if (child.tagName === "TR") rows.push(child);
    else if (/^T(HEAD|BODY|FOOT)$/.test(child.tagName)) {
      rows.push(...Array.from(child.children).filter((row) => row.tagName === "TR"));
    }
  }
  return rows;
}

/** Một ô chỉ được nằm trên một dòng, cả trong bảng GFM lẫn trong một dòng TSV. */
function cellText(cell: Element, mode: Mode): string {
  const blocks = blocksOf(cell, mode).map((block) => block.text);
  if (mode === "text") return blocks.join(" ").replace(/\s*[\n\t]\s*/g, " ");
  return blocks.join("<br>").replace(/\n/g, "<br>").replace(/\|/g, "\\|");
}

function linkCard(el: Element, mode: Mode): string {
  const videoId = el.getAttribute("data-youtube-id");
  const url =
    el.getAttribute("data-url") ||
    el.getAttribute("href") ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
  if (!url) return "";
  const title = el.getAttribute("data-title")?.trim();
  if (mode === "text") return title ? `${title}\n${url}` : url;
  return title ? `[${escapeInline(title)}](${escapeUrl(url)})` : `<${url}>`;
}

function inlineOf(nodes: Iterable<Node> | ArrayLike<Node>, mode: Mode): string {
  let out = "";
  for (const node of Array.from(nodes)) out += inlineNode(node, mode);
  return out;
}

function inlineNode(node: Node, mode: Mode): string {
  if (node.nodeType === TEXT_NODE) {
    const value = (node.nodeValue ?? "").replace(/[\t\n\r]+/g, " ");
    return mode === "markdown" ? escapeInline(value) : value;
  }
  if (node.nodeType !== ELEMENT_NODE) return "";

  const el = node as Element;
  const inner = () => inlineOf(el.childNodes, mode);
  if (mode === "text") {
    if (el.tagName === "BR") return "\n";
    if (el.tagName === "IMG") return "";
    return inner();
  }

  switch (el.tagName) {
    case "BR":
      return "\\\n";
    case "STRONG":
    case "B":
      return wrap("**", inner());
    case "EM":
    case "I":
      return wrap("*", inner());
    case "S":
    case "DEL":
    case "STRIKE":
      return wrap("~~", inner());
    case "CODE":
      return codeSpan(el.textContent ?? "");
    case "A":
      return link(el, inner());
    case "IMG": {
      const src = el.getAttribute("src");
      return src ? `![${escapeInline(el.getAttribute("alt") ?? "")}](${escapeUrl(src)})` : "";
    }
    default:
      // Gạch dưới và mọi thẻ khác: Markdown không có cú pháp, giữ chữ.
      return inner();
  }
}

function link(el: Element, text: string): string {
  const href = el.getAttribute("href");
  if (!href || !text.trim()) return text;
  // Autolink chỉ hợp lệ với địa chỉ có scheme.
  if (el.textContent === href && /^[a-z][a-z\d+.-]*:/i.test(href)) return `<${href}>`;
  return `[${text}](${escapeUrl(href)})`;
}

/**
 * `**đậm **` không phải cú pháp: dấu đóng không được đứng sau khoảng trắng.
 * Khoảng trắng ở hai mép được đưa ra ngoài dấu.
 */
function wrap(delimiter: string, inner: string): string {
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)!;
  return core ? `${lead}${delimiter}${core}${delimiter}${trail}` : inner;
}

function codeSpan(text: string): string {
  if (!text) return "";
  const fence = "`".repeat(longestRun(text, "`") + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

function longestRun(text: string, char: string): number {
  let longest = 0;
  let current = 0;
  for (const c of text) {
    current = c === char ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

function escapeInline(text: string): string {
  return text.replace(/[\\`*_[\]~]/g, "\\$&").replace(/<(?=[A-Za-z/!?])/g, "\\<");
}

/** Những đầu dòng mà Markdown sẽ đọc thành tiêu đề, list hay trích dẫn. */
function escapeLines(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const ordered = /^(\s*\d{1,9})([.)])(?=\s|$)/.exec(line);
      if (ordered) return `${ordered[1]}\\${ordered[2]}${line.slice(ordered[0].length)}`;
      return line.replace(/^(\s*)(#{1,6}(?=\s|$)|[-+](?=\s|$)|>|-(?=-{2,}\s*$))/, "$1\\$2");
    })
    .join("\n");
}

function escapeUrl(url: string): string {
  return url.replace(/[ ()<>]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
