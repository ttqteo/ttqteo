import type { MermaidConfig } from "mermaid";

export const MERMAID_LANGUAGE = "mermaid";

const LANGUAGE_PREFIX = "language-";

/**
 * Ngôn ngữ của một khối code, đọc từ bất kỳ chỗ nào nó được ghi. Editor ghi
 * class lên `<code>`, còn rehype-prism-plus chép thêm lên `<pre>`, nên cả hai
 * đều phải tra được bằng một hàm.
 */
export function languageOf(pre: Element): string | null {
  const classes = [
    ...Array.from(pre.classList),
    ...Array.from(pre.querySelector("code")?.classList ?? []),
  ];
  const found = classes.find((name) => name.startsWith(LANGUAGE_PREFIX));
  return found ? found.slice(LANGUAGE_PREFIX.length) : null;
}

export function isMermaidPre(pre: Element): boolean {
  return languageOf(pre) === MERMAID_LANGUAGE;
}

let loading: Promise<typeof import("mermaid").default> | null = null;
let counter = 0;

/**
 * mermaid nặng gần một megabyte và phần lớn bài viết không có sơ đồ nào, nên
 * nó chỉ được nạp từ đây, bên trong một effect, không bao giờ ở top level của
 * một module nằm trên đường render bài viết.
 */
function load(): Promise<typeof import("mermaid").default> {
  loading ??= import("mermaid").then((mod) => mod.default);
  return loading;
}

export async function renderMermaid(
  source: string,
  { dark }: { dark: boolean },
): Promise<string> {
  const mermaid = await load();
  counter += 1;
  const id = `mermaid-${counter}`;

  // initialize lại mỗi lần vẽ là cách duy nhất đổi theme: mermaid nướng màu
  // thẳng vào SVG lúc render, nên một sơ đồ nền sáng không sửa lại được bằng
  // CSS khi người đọc bật dark mode.
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    // Bài viết do chủ site tự soạn, nhưng không sơ đồ nào cần HTML thô trong
    // nhãn node, nên đóng luôn cửa đó. Trang mindmap giữ "loose" vì nó cần bắt
    // click, đó là chuyện riêng của nó.
    securityLevel: "strict",
    fontFamily: "inherit",
  } satisfies MermaidConfig);

  try {
    const { svg } = await mermaid.render(id, source);
    return svg;
  } finally {
    // Khi parse hỏng, mermaid bỏ lại cái div tạm nó dựng để đo chữ. Không dọn
    // thì mỗi lần gõ sai cú pháp lại thêm một xác trong body.
    document.getElementById(`d${id}`)?.remove();
  }
}
