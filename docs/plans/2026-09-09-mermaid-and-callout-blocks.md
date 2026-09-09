# Mermaid và Callout Block Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Thêm hai loại khối cho bài viết. Một, khối code `mermaid` render thành sơ đồ. Hai, khối callout kiểu Notion để làm nổi bật tóm tắt hoặc đoạn quan trọng.

**Architecture:** Hai khối đi hai đường khác nhau vì bản chất khác nhau. Mermaid không thêm node nào vào schema: nó chỉ là code block sẵn có với `language: "mermaid"`, lưu xuống đúng `<pre><code class="language-mermaid">`, thứ mà cả editor lẫn `rehype-prism-plus` cùng phát ra, rồi một component client duy nhất vẽ nó ở cả ba đường đọc. Callout thì ngược lại, cần một node TipTap mới nhưng không cần một dòng JavaScript nào trên đường đọc: nó render ra `<div class="callout" data-callout="note">` và toàn bộ diện mạo nằm trong `globals.css`.

**Tech Stack:** Next.js 16 App Router, React 19, TipTap 3, mermaid 11, next-themes, Tailwind + `@tailwindcss/typography`, vitest + happy-dom + Testing Library.

---

## Bối cảnh cần biết trước khi sửa

Ba đường một bài viết đi tới màn hình:

1. **Bài soạn bằng editor.** Nội dung là một chuỗi HTML trong Supabase. [app/blog/[...slug]/page.tsx:118](app/blog/[...slug]/page.tsx#L118) và [app/series/[topic]/[...slug]/page.tsx:109](app/series/[topic]/[...slug]/page.tsx#L109) đưa chuỗi đó vào `PostBody html={...}`, và [components/post-html.tsx](components/post-html.tsx) đổ nó ra bằng `dangerouslySetInnerHTML` rồi đi bộ trên DOM để gắn thanh copy. Đường này không có React cho từng khối.
2. **Bài MDX trong `contents/`.** [lib/markdown.ts:56](lib/markdown.ts#L56) biên dịch qua `next-mdx-remote/rsc`; `pre` được map sang [components/markdown/pre.tsx](components/markdown/pre.tsx). Hai plugin `preProcess`/`postProcess` ở [lib/markdown.ts:168-185](lib/markdown.ts#L168-L185) đã đính source gốc của khối vào thuộc tính `raw` của `<pre>`, và `rehype-prism-plus` chép luôn class `language-*` lên chính thẻ `<pre>`. Đó là hai thứ ta cần, không phải thêm gì.
3. **Preview trong admin.** [app/admin/edit/[id]/edit-post-client.tsx:1094](app/admin/edit/[id]/edit-post-client.tsx#L1094) dùng lại `PostBody`, nên tự động có mọi thứ đường 1 có. Không cần task riêng.

**Luật quan trọng nhất của repo này**, chép lại từ [components/extensions/link-card.ts:17-24](components/extensions/link-card.ts#L17-L24): nội dung bài viết được lưu là chuỗi `editor.getHTML()` trả về và đọc lại bằng `dangerouslySetInnerHTML`, nên **cái `renderHTML` phát ra chính là cái người đọc nhận**. Tailwind chỉ quét `.ts`/`.tsx`, nên utility class chỉ tồn tại trong một chuỗi nằm dưới database sẽ không được sinh CSS và sẽ xẹp lép ở production. Vì vậy node mới phải dùng class ngữ nghĩa, style trong `globals.css`. Đừng viết `bg-blue-50` vào `renderHTML`.

Vài điều đã kiểm chứng, đừng kiểm lại:

- `refractor` 5 **có** grammar `mermaid` (`node_modules/.pnpm/refractor@5.0.0/.../lang/mermaid.js`), nên fence ```` ```mermaid ```` trong MDX không làm `rehype-prism-plus` ném lỗi lúc build. Không cần bật `ignoreMissing`.
- `mermaid@11.17.2` đã nằm trong `dependencies`. Không cài thêm gói nào cho phần A.
- [components/mermaid-renderer.tsx](components/mermaid-renderer.tsx) đã tồn tại nhưng **chỉ** phục vụ `app/mindmap/*`: nó import `mermaid` ở top level, debounce 300ms cho lúc gõ, ép `min-height: 300px`, và chạy `securityLevel: "loose"` để bắt click vào node. Không dùng lại nó cho bài viết. Task 8 sẽ kéo nó về chung một loader.
- MDX đã có sẵn callout riêng là [components/markdown/note.tsx](components/markdown/note.tsx) với bốn kiểu note/danger/warning/success. Phần B nhắm vào editor; task 13 hợp nhất diện mạo của hai bên.

---

# PHẦN A: Sơ đồ Mermaid

## Task 1: Loader và helper dùng chung

**Files:**
- Create: `lib/mermaid.ts`
- Test: `lib/mermaid.test.ts`

**Step 1: Viết test thất bại**

```ts
// lib/mermaid.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string, source: string) => {
      if (source.includes("boom")) throw new Error("Parse error on line 1");
      return { svg: `<svg data-id="${id}">${source}</svg>` };
    }),
  },
}));

import mermaid from "mermaid";
import { isMermaidPre, languageOf, renderMermaid } from "./mermaid";

function pre(html: string): HTMLPreElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.querySelector("pre")!;
}

describe("languageOf", () => {
  it("đọc ngôn ngữ từ thẻ code, chỗ editor ghi vào", () => {
    expect(languageOf(pre('<pre><code class="language-java">x</code></pre>'))).toBe("java");
  });

  it("đọc ngôn ngữ từ chính thẻ pre, chỗ rehype-prism-plus ghi vào", () => {
    expect(languageOf(pre('<pre class="language-mermaid"><code>x</code></pre>'))).toBe("mermaid");
  });

  it("trả về null khi khối không khai báo ngôn ngữ", () => {
    expect(languageOf(pre("<pre><code>ls -la</code></pre>"))).toBeNull();
  });
});

describe("isMermaidPre", () => {
  it("chỉ nhận đúng language-mermaid", () => {
    expect(isMermaidPre(pre('<pre><code class="language-mermaid">graph TD</code></pre>'))).toBe(true);
    expect(isMermaidPre(pre('<pre><code class="language-mermaidjs">graph TD</code></pre>'))).toBe(false);
  });
});

describe("renderMermaid", () => {
  beforeEach(() => {
    vi.mocked(mermaid.initialize).mockClear();
  });

  it("trả về SVG và chọn theme sáng", async () => {
    const svg = await renderMermaid("graph TD; A-->B", { dark: false });
    expect(svg).toContain("<svg");
    expect(vi.mocked(mermaid.initialize).mock.calls[0][0]).toMatchObject({
      theme: "default",
      securityLevel: "strict",
    });
  });

  it("chọn theme tối khi được yêu cầu", async () => {
    await renderMermaid("graph TD; A-->B", { dark: true });
    expect(vi.mocked(mermaid.initialize).mock.calls[0][0]).toMatchObject({ theme: "dark" });
  });

  it("cấp id khác nhau cho mỗi lần vẽ", async () => {
    const a = await renderMermaid("graph TD; A-->B", { dark: false });
    const b = await renderMermaid("graph TD; A-->B", { dark: false });
    expect(a).not.toBe(b);
  });

  it("để lỗi cú pháp ném ra ngoài cho người gọi xử lý", async () => {
    await expect(renderMermaid("boom", { dark: false })).rejects.toThrow("Parse error");
  });
});
```

**Step 2: Chạy để chắc là nó fail**

Run: `pnpm vitest run lib/mermaid.test.ts`
Expected: FAIL, `Failed to resolve import "./mermaid"`.

**Step 3: Viết implementation tối thiểu**

```ts
// lib/mermaid.ts
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
```

**Step 4: Chạy lại để chắc là nó pass**

Run: `pnpm vitest run lib/mermaid.test.ts`
Expected: PASS, 8 tests.

**Step 5: Commit**

```bash
git add lib/mermaid.ts lib/mermaid.test.ts
git commit -m "feat: add a lazy mermaid loader and code-block language helpers"
```

---

## Task 2: Component `MermaidDiagram`

Một khối duy nhất dùng cho cả ba đường. Nó mượn nguyên các class `.code-shell*` sẵn có nên sơ đồ và khối code trông như cùng một loại vật thể, và khi cú pháp sai nó rơi về hiển thị source thay vì để lại một khoảng trắng câm.

**Files:**
- Create: `components/mermaid-diagram.tsx`
- Test: `tests/components/mermaid-diagram.test.tsx`

**Step 1: Viết test thất bại**

```tsx
// tests/components/mermaid-diagram.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string, source: string) => {
      if (source.includes("boom")) throw new Error("Parse error on line 1");
      return { svg: '<svg role="img" aria-label="sơ đồ"></svg>' };
    }),
  },
}));

import { MermaidDiagram } from "@/components/mermaid-diagram";

const CHART = "graph TD; A-->B";

describe("MermaidDiagram", () => {
  it("vẽ sơ đồ ra SVG", async () => {
    render(<MermaidDiagram source={CHART} />);
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("hiện source khi bấm nút xem code, và quay lại được", async () => {
    const user = userEvent.setup();
    render(<MermaidDiagram source={CHART} />);
    await screen.findByRole("img", { name: "sơ đồ" });

    await user.click(screen.getByRole("button", { name: "code" }));
    expect(screen.getByText(CHART)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "sơ đồ" }));
    expect(screen.getByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("giữ lại source khi cú pháp sai, không nuốt mất khối", async () => {
    render(<MermaidDiagram source="boom" />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByText(/Parse error on line 1/)).toBeInTheDocument();
  });

  it("copy đúng source gốc chứ không phải SVG", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const user = userEvent.setup();

    render(<MermaidDiagram source={CHART} />);
    await screen.findByRole("img", { name: "sơ đồ" });
    await user.click(screen.getByRole("button", { name: "copy" }));

    expect(writeText).toHaveBeenCalledWith(CHART);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "đã copy" })).toBeInTheDocument(),
    );
  });
});
```

Nếu `@testing-library/user-event` chưa có trong `devDependencies` thì cài trước:
`pnpm add -D @testing-library/user-event`

**Step 2: Chạy để chắc là nó fail**

Run: `pnpm vitest run tests/components/mermaid-diagram.test.tsx`
Expected: FAIL, không resolve được `@/components/mermaid-diagram`.

**Step 3: Viết implementation tối thiểu**

```tsx
// components/mermaid-diagram.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { MERMAID_LANGUAGE, renderMermaid } from "@/lib/mermaid";

const COPY = "copy";
const COPIED = "đã copy";
const FAILED = "lỗi";

/**
 * Một sơ đồ mermaid trong bài viết. Dùng chung cho cả ba đường: portal từ
 * PostHtml cho bài soạn bằng editor, component `pre` cho bài MDX, và node view
 * cho khung soạn thảo. Chrome mượn nguyên `.code-shell*` để sơ đồ và khối code
 * đọc như cùng một loại vật thể.
 */
export function MermaidDiagram({ source }: { source: string }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [copyLabel, setCopyLabel] = useState(COPY);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    renderMermaid(source, { dark }).then(
      (out) => {
        if (!live) return;
        setSvg(out);
        setError(null);
      },
      (err: unknown) => {
        if (!live) return;
        // Một sơ đồ không parse được vẫn phải để lại source của nó: mất hẳn
        // khối trông như bài viết rụng mất một đoạn.
        setSvg(null);
        setError(err instanceof Error ? err.message : "sơ đồ không hợp lệ");
      },
    );
    return () => {
      live = false;
    };
  }, [source, dark]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = () => {
    // Safari cũ và mọi origin không bảo mật đều không có clipboard API; nói
    // thẳng ra hơn là một cái nút trông như đã chạy.
    const done = navigator.clipboard?.writeText(source);
    if (!done) {
      setCopyLabel(FAILED);
      return;
    }
    done.then(
      () => setCopyLabel(COPIED),
      () => setCopyLabel(FAILED),
    );
    timer.current = window.setTimeout(() => setCopyLabel(COPY), 1500);
  };

  const asSource = showSource || error !== null;

  return (
    <div className="code-shell" aria-busy={svg === null && error === null}>
      <div className="code-shell-bar">
        <span className="code-shell-lang">{MERMAID_LANGUAGE}</span>
        <span className="flex items-center gap-1">
          {error === null && (
            <button
              type="button"
              className="code-shell-copy"
              onClick={() => setShowSource((on) => !on)}
            >
              {showSource ? "sơ đồ" : "code"}
            </button>
          )}
          <button type="button" className="code-shell-copy" onClick={copy}>
            {copyLabel}
          </button>
        </span>
      </div>

      {asSource ? (
        <pre>
          <code className={`language-${MERMAID_LANGUAGE}`}>{source}</code>
        </pre>
      ) : svg ? (
        // SVG đến từ mermaid ở securityLevel "strict", nhãn node đã được nó
        // sanitize; đây là cách duy nhất gắn một cây SVG dựng sẵn vào React.
        <div className="mermaid-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="mermaid-skeleton">đang vẽ sơ đồ…</div>
      )}

      {error !== null && <p className="mermaid-error">sơ đồ lỗi: {error}</p>}
    </div>
  );
}
```

**Step 4: Chạy lại để chắc là nó pass**

Run: `pnpm vitest run tests/components/mermaid-diagram.test.tsx`
Expected: PASS, 4 tests.

**Step 5: Commit**

```bash
git add components/mermaid-diagram.tsx tests/components/mermaid-diagram.test.tsx
git commit -m "feat: add the mermaid diagram block used by every read path"
```

---

## Task 3: CSS cho sơ đồ

Không có test tự động; kiểm bằng mắt ở Task 7.

**Files:**
- Modify: `app/globals.css` (chèn ngay sau khối `.code-shell > pre > code`, khoảng dòng 500)

**Step 1: Thêm style**

```css
/* Sơ đồ mermaid trong bài viết. Dùng lại `.code-shell` và thanh của nó, chỉ
   thêm phần khung vẽ, nên một sơ đồ và một khối code đọc như cùng một loại
   vật thể. */
.mermaid-canvas {
  @apply overflow-x-auto p-4;
}
.mermaid-canvas svg {
  @apply mx-auto h-auto max-w-full;
}
.mermaid-skeleton {
  @apply p-8 text-center font-mono text-xs text-muted-foreground;
}
.mermaid-error {
  @apply m-0 border-t px-3 py-1 font-mono text-[11px] text-destructive;
}

/* Chỗ PostHtml thay một `<pre class="language-mermaid">` bằng container để
   portal React vào. Không style gì ngoài việc xoá margin thừa của prose. */
.mermaid-slot {
  @apply m-0;
}

/* Sơ đồ xem trước ngay dưới khối code trong khung soạn thảo. Nó nằm dưới chứ
   không thay chỗ `<pre>`: ProseMirror cần contentDOM ở nguyên trong document,
   giấu nó đi là mời lỗi toạ độ con trỏ. */
.code-block-preview {
  @apply mt-2 rounded-lg border bg-background;
}
.code-block-controls {
  @apply absolute right-2 top-2 z-10 flex items-center gap-1;
}
.code-block-preview-toggle {
  @apply rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground;
}
```

**Step 2: Sửa `.code-block-lang` cho khớp container mới**

Bỏ `absolute right-2 top-2 z-10` khỏi `.code-block-lang` (dòng ~460), giữ nguyên phần còn lại:

```css
.code-block-lang {
  @apply rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground outline-none;
}
```

Việc định vị chuyển sang `.code-block-controls`, bao cả select lẫn nút xem trước.

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: add mermaid canvas chrome and a controls row for code blocks"
```

---

## Task 4: `PostHtml` gắn sơ đồ vào bài soạn bằng editor

`PostHtml` đổ HTML thô bằng `dangerouslySetInnerHTML` nên không có chỗ nào để render một component React vào giữa. Cách nối là thay `<pre>` mermaid bằng một container rỗng rồi `createPortal` component vào đó.

**Files:**
- Modify: `components/post-html.tsx`
- Test: `tests/components/post-html.test.tsx`

**Step 1: Viết test thất bại**

```tsx
// tests/components/post-html.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: '<svg role="img" aria-label="sơ đồ"></svg>' })),
  },
}));

import { PostHtml } from "@/components/post-html";

const MERMAID = '<pre><code class="language-mermaid">graph TD; A--&gt;B</code></pre>';

describe("PostHtml", () => {
  it("biến khối mermaid thành sơ đồ", async () => {
    render(<PostHtml html={MERMAID} />);
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("vẫn bọc khối code thường bằng thanh copy như cũ", () => {
    const { container } = render(
      <PostHtml html='<pre><code class="language-java">class A {}</code></pre>' />,
    );
    expect(container.querySelector(".code-shell-lang")?.textContent).toBe("java");
    expect(screen.getByRole("button", { name: "copy" })).toBeInTheDocument();
  });

  it("xử lý được bài có cả hai loại khối", async () => {
    const { container } = render(
      <PostHtml html={MERMAID + '<pre><code class="language-sql">select 1</code></pre>'} />,
    );
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
    // Hai thanh: một do PostHtml dựng cho khối sql, một do MermaidDiagram tự
    // render cho sơ đồ.
    expect(container.querySelectorAll(".code-shell-lang")).toHaveLength(2);
    expect(container.querySelector(".mermaid-slot")).not.toBeNull();
  });

  it("không để lại `<pre>` mermaid trần trong DOM", async () => {
    const { container } = render(<PostHtml html={MERMAID} />);
    await screen.findByRole("img", { name: "sơ đồ" });
    expect(container.querySelector(".mermaid-slot > pre")).toBeNull();
  });
});
```

**Step 2: Chạy để chắc là nó fail**

Run: `pnpm vitest run tests/components/post-html.test.tsx`
Expected: FAIL ở ba test mermaid, PASS ở test khối code thường.

**Step 3: Sửa `components/post-html.tsx`**

Import thêm và khai báo kiểu slot:

```tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { isMermaidPre } from "@/lib/mermaid";

type Slot = { key: string; container: HTMLElement; source: string };
```

Trong component thêm `const [slots, setSlots] = useState<Slot[]>([]);`, rồi rẽ nhánh ngay đầu vòng `forEach` và thu slot lại:

```tsx
    const timers: number[] = [];
    const found: Slot[] = [];

    root.querySelectorAll("pre").forEach((pre, index) => {
      if (pre.parentElement?.classList.contains("code-shell")) return;

      // Một sơ đồ không phải khối code: `<pre>` bị thay bằng một container rỗng
      // để React portal component vào. Làm trước phần copy button, vì sơ đồ tự
      // dựng thanh của nó.
      if (isMermaidPre(pre)) {
        const source = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        const container = document.createElement("div");
        container.className = "mermaid-slot";
        pre.replaceWith(container);
        found.push({ key: `mermaid-${index}`, container, source });
        return;
      }

      /* ...phần dựng code-shell giữ nguyên như hiện tại... */
    });

    setSlots(found);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      // Khi `html` đổi, React dựng lại toàn bộ subtree và mọi container ở trên
      // bị tháo khỏi document. Bỏ slot cũ đi trước khi effect mới chạy, nếu
      // không portal sẽ trỏ vào node đã mồ côi.
      setSlots([]);
    };
  }, [html]);

  return (
    <>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
      {slots.map((slot) =>
        createPortal(<MermaidDiagram source={slot.source} />, slot.container, slot.key),
      )}
    </>
  );
```

Lưu ý cho người thực hiện: `setSlots` trong effect gây thêm một lần render. **Đừng thêm `slots` vào mảng dependency**, sẽ thành vòng lặp vô tận.

Và một cái bẫy đã sập lúc thực hiện, ghi lại ở đây: React 19 so prop bằng identity chứ không so chuỗi `__html` như React 18, nên một object literal `{ __html: html }` mới ở mỗi lần render là đủ để nó ghi đè `innerHTML` và xoá sạch những gì effect vừa dựng. Phải giữ object đó ổn định:

```tsx
const inner = useMemo(() => ({ __html: html }), [html]);
...
<div ref={ref} dangerouslySetInnerHTML={inner} />
```

**Step 4: Chạy lại để chắc là nó pass**

Run: `pnpm vitest run tests/components/post-html.test.tsx`
Expected: PASS, 4 tests.

**Step 5: Commit**

```bash
git add components/post-html.tsx tests/components/post-html.test.tsx
git commit -m "feat: render mermaid blocks in editor-authored posts"
```

---

## Task 5: Bài MDX

**Files:**
- Modify: `components/markdown/pre.tsx`
- Test: `tests/components/markdown-pre.test.tsx`

**Step 1: Viết test thất bại**

```tsx
// tests/components/markdown-pre.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: '<svg role="img" aria-label="sơ đồ"></svg>' })),
  },
}));

import Pre from "@/components/markdown/pre";

describe("Pre", () => {
  it("đưa fence mermaid sang MermaidDiagram, dùng source gốc chứ không phải markup đã tô màu", async () => {
    render(
      <Pre className="language-mermaid" raw="graph TD; A-->B">
        <code>
          <span className="token">graph</span>
        </code>
      </Pre>,
    );
    expect(await screen.findByRole("img", { name: "sơ đồ" })).toBeInTheDocument();
  });

  it("để khối code thường đi đường cũ", () => {
    const { container } = render(
      <Pre className="language-java" raw="class A {}">
        <code>class A {}</code>
      </Pre>,
    );
    expect(container.querySelector("pre")).not.toBeNull();
  });

  it("không nhận nhầm ngôn ngữ có tiền tố giống", () => {
    const { container } = render(
      <Pre className="language-mermaidjs" raw="x">
        <code>x</code>
      </Pre>,
    );
    expect(container.querySelector("pre")).not.toBeNull();
  });
});
```

**Step 2: Chạy để chắc là nó fail**

Run: `pnpm vitest run tests/components/markdown-pre.test.tsx`
Expected: FAIL ở test đầu, hai test sau PASS.

**Step 3: Sửa `components/markdown/pre.tsx`**

```tsx
import { ComponentProps } from "react";
import Copy from "./copy";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { MERMAID_LANGUAGE } from "@/lib/mermaid";

const LANGUAGE = /(?:^|\s)language-([\w-]+)/;

export default function Pre({
  children,
  raw,
  ...rest
}: ComponentProps<"pre"> & { raw?: string }) {
  // rehype-prism-plus chép ngôn ngữ của fence lên chính thẻ `<pre>`, đó là chỗ
  // duy nhất một component map cho `pre` đọc được nó. `raw` thì do preProcess
  // trong lib/markdown.ts đính vào, và với mermaid nó là thứ bắt buộc: children
  // lúc này đã bị prism băm thành span, không còn là source vẽ được.
  const language = LANGUAGE.exec(String(rest.className ?? ""))?.[1];
  if (language === MERMAID_LANGUAGE && raw) {
    return <MermaidDiagram source={raw} />;
  }

  return (
    <div className="my-5 relative">
      {/* ...phần còn lại giữ nguyên... */}
    </div>
  );
}
```

**Step 4: Chạy lại để chắc là nó pass**

Run: `pnpm vitest run tests/components/markdown-pre.test.tsx`
Expected: PASS, 3 tests.

**Step 5: Commit**

```bash
git add components/markdown/pre.tsx tests/components/markdown-pre.test.tsx
git commit -m "feat: render mermaid fences in MDX posts"
```

---

## Task 6: Chọn mermaid trong editor và xem trước tại chỗ

**Files:**
- Modify: `components/extensions/code-block-language.tsx`
- Test: `components/extensions/code-block-language.test.ts`

**Step 1: Viết test thất bại**

Thêm vào cuối `components/extensions/code-block-language.test.ts`:

```ts
describe("mermaid", () => {
  it("nằm trong danh sách chọn được", () => {
    expect(CODE_LANGUAGES).toContain("mermaid");
  });

  it("lưu xuống đúng class mà PostHtml và rehype-prism-plus cùng hiểu", () => {
    const html = generateHTML(doc("mermaid", "graph TD; A-->B"), extensions);
    expect(html).toContain('<code class="language-mermaid">');
    expect(html).toContain("graph TD; A--&gt;B");
  });

  it("đọc ngược lại được sau một vòng render/parse", () => {
    const once = generateHTML(doc("mermaid", "graph TD; A-->B"), extensions);
    expect(generateHTML(generateJSON(once, extensions), extensions)).toBe(once);
  });
});
```

**Step 2: Chạy để chắc là nó fail**

Run: `pnpm vitest run components/extensions/code-block-language.test.ts`
Expected: FAIL ở test đầu, `expected [...] to contain 'mermaid'`.

**Step 3: Sửa `components/extensions/code-block-language.tsx`**

Thêm `"mermaid"` vào `CODE_LANGUAGES` giữa `"markdown"` và `"php"` để giữ thứ tự alphabet mà test `language list` sẵn có đang kiểm.

Rồi đổi `CodeBlockView`:

```tsx
"use client";

import { useState } from "react";
import CodeBlock from "@tiptap/extension-code-block";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { MERMAID_LANGUAGE } from "@/lib/mermaid";

function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = (node.attrs.language as string | null) ?? "";
  const isMermaid = language === MERMAID_LANGUAGE;
  const [preview, setPreview] = useState(false);

  return (
    <NodeViewWrapper className="code-block-shell">
      {/* Kept out of the editable flow: without this, clicking a control moves
          the selection into the block and typing goes into the code. */}
      <div className="code-block-controls" contentEditable={false} suppressContentEditableWarning>
        {isMermaid && (
          <button
            type="button"
            className="code-block-preview-toggle"
            onClick={() => setPreview((on) => !on)}
          >
            {preview ? "ẩn sơ đồ" : "xem sơ đồ"}
          </button>
        )}
        <select
          className="code-block-lang"
          value={language}
          disabled={!editor.isEditable}
          aria-label="Ngôn ngữ của khối code"
          onChange={(event) => updateAttributes({ language: event.target.value })}
        >
          <option value="">plain</option>
          {CODE_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <pre>
        {/* The tag parameter is explicit because `as` is wrapped in NoInfer,
            so it cannot be deduced from the prop and would default to div. */}
        <NodeViewContent<"code"> as="code" />
      </pre>
      {/* Sơ đồ nằm dưới code chứ không thay chỗ nó: ProseMirror cần contentDOM
          ở nguyên trong document, giấu đi là mời lỗi toạ độ con trỏ. Vẽ theo
          `node.textContent` nên tắt rồi bật lại là thấy bản mới nhất. */}
      {isMermaid && preview && (
        <div className="code-block-preview" contentEditable={false} suppressContentEditableWarning>
          <MermaidDiagram source={node.textContent} />
        </div>
      )}
    </NodeViewWrapper>
  );
}
```

`contentEditable={false}` chuyển từ chính `<select>` lên `.code-block-controls`, tác dụng như cũ nhưng phủ cả nút mới.

**Step 4: Chạy lại để chắc là nó pass**

Run: `pnpm vitest run components/extensions/code-block-language.test.ts`
Expected: PASS, 9 tests.

**Step 5: Commit**

```bash
git add components/extensions/code-block-language.tsx components/extensions/code-block-language.test.ts
git commit -m "feat: offer mermaid in the code block picker with an inline preview"
```

---

## Task 7: Kiểm sơ đồ bằng mắt trên app thật

Không test tự động nào chạy được mermaid thật (happy-dom không đo được chữ trong SVG), nên bước này bắt buộc.

**Step 1:** `pnpm test` rồi `pnpm lint`. Cả hai phải xanh.

**Step 2:** `pnpm dev`.

**Step 3:** Vào `/admin`, tạo bài nháp, chèn code block, chọn `mermaid`, dán:

```
flowchart TD
  A[Người đọc] --> B{Có sơ đồ?}
  B -->|có| C[Vẽ bằng mermaid]
  B -->|không| D[Khối code thường]
```

Kiểm:
- Bấm "xem sơ đồ": sơ đồ hiện dưới phần code, bấm lại thì ẩn.
- Sang tab Preview: thấy sơ đồ với thanh `mermaid` + `code` + `copy`.
- Bấm `code`: về source. Bấm `copy`: nhãn đổi thành "đã copy", dán ra chỗ khác đúng source gốc.
- Đổi theme sáng/tối: sơ đồ vẽ lại theo màu mới, không đứng nguyên màu cũ.

**Step 4:** Sửa dòng đầu thành `flowchart ZZZ`. Kỳ vọng: thanh vẫn còn, source hiện ra, có dòng đỏ "sơ đồ lỗi: ...". Không có khoảng trắng câm.

**Step 5:** Thêm một fence ```` ```mermaid ```` vào một file trong `contents/blogs/`, mở bài đó. Sơ đồ phải render giống hệt đường editor.

**Step 6:** `pnpm build`, rồi mở một bài **không** có sơ đồ và xem Network tab: không có chunk mermaid nào được tải. Nếu có, tức đâu đó còn `import mermaid` ở top level trên đường render bài viết, tìm và bỏ.

---

## Task 8: Kéo trang mindmap về chung một loader

Sau task 1 thì `mermaid.initialize` bị viết ở hai chỗ, và `components/mermaid-renderer.tsx` vẫn import `mermaid` tĩnh, nên `/mindmap` tải thư viện ngay cả trước khi có sơ đồ nào.

**Files:**
- Modify: `lib/mermaid.ts`, `lib/mermaid.test.ts`, `components/mermaid-renderer.tsx`

**Step 1: Mở rộng chữ ký `renderMermaid` cho phép đè config**

```ts
export async function renderMermaid(
  source: string,
  { dark, ...overrides }: { dark: boolean } & Omit<MermaidConfig, "theme" | "startOnLoad">,
): Promise<string> {
  ...
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "strict",
    fontFamily: "inherit",
    ...overrides,
  } satisfies MermaidConfig);
```

Thêm một test: gọi với `{ dark: false, securityLevel: "loose" }` và kiểm `initialize` nhận `securityLevel: "loose"`.

**Step 2: Sửa `components/mermaid-renderer.tsx`**

Bỏ `import mermaid from "mermaid"` ở đầu file. Trong effect thay cụm `initialize` + `render` bằng:

```tsx
const svg = await renderMermaid(chart, {
  dark: (resolvedTheme || theme) === "dark",
  // Mindmap bắt click vào node nên cần nhãn dựng bằng HTML, khác bài viết.
  securityLevel: "loose",
  mindmap: { padding: 20, useMaxWidth: true },
});
```

Debounce 300ms, `onNodeClick` và min-height giữ nguyên, đó là nhu cầu riêng của trang mindmap.

**Step 3:** `pnpm test` xanh. Mở `/mindmap`, vẽ một mindmap, click vào node: menu vẫn bật.

**Step 4: Commit**

```bash
git add lib/mermaid.ts lib/mermaid.test.ts components/mermaid-renderer.tsx
git commit -m "refactor: load mermaid lazily on the mindmap page too"
```

---

# PHẦN B: Khối Callout

Khối để làm nổi bật tóm tắt hoặc đoạn quan trọng, kiểu callout của Notion.

**Khác mermaid ở một điểm cốt lõi:** callout không cần một dòng JavaScript nào trên đường đọc. Nó là một `<div>` với class ngữ nghĩa, style trong `globals.css`, nên `PostHtml` không phải sửa gì và tab preview lẫn trang public tự có. Toàn bộ công việc nằm ở node TipTap và CSS.

**Bốn kiểu**, chọn cho khớp `components/markdown/note.tsx` sẵn có để hai nguồn bài không nói hai thứ tiếng: `note` (mặc định, trung tính, dùng cho tóm tắt), `tip`, `warning`, `danger`. Nếu thấy thừa thì cắt bớt trong `CALLOUT_VARIANTS`, mọi thứ khác tự co theo.

**Hình dạng HTML lưu xuống:**

```html
<div class="callout callout-note" data-callout="note">
  <p>Tóm tắt của bài này là...</p>
</div>
```

`data-callout` là hợp đồng định dạng, `class` chỉ là chuyện trình bày. Đây đúng luật mà `link-card.ts` đã đặt: giá trị đọc lại từ `data-*`, không đọc từ class, vì class có thể bị đổi tên.

---

## Task 9: Node `Callout`

**Files:**
- Create: `components/extensions/callout.tsx`
- Test: `components/extensions/callout.test.ts`

**Step 1: Viết test thất bại**

```ts
// components/extensions/callout.test.ts
import { generateHTML, generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { CALLOUT_VARIANTS, Callout } from "./callout";

const extensions = [StarterKit, Callout];

const doc = (variant: string | null, text: string) => ({
  type: "doc",
  content: [
    {
      type: "callout",
      attrs: variant === null ? {} : { variant },
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
  ],
});

function nodes(html: string) {
  return (
    generateJSON(html, extensions) as {
      content: { type: string; attrs: Record<string, unknown> }[];
    }
  ).content;
}

describe("stored markup", () => {
  it("ghi kiểu ra cả data attribute lẫn class", () => {
    const html = generateHTML(doc("warning", "Cẩn thận"), extensions);
    expect(html).toContain('data-callout="warning"');
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain("<p>Cẩn thận</p>");
  });

  it("dùng note khi không chỉ định kiểu", () => {
    expect(generateHTML(doc(null, "Tóm tắt"), extensions)).toContain('data-callout="note"');
  });

  it("chỉ dùng class ngữ nghĩa, không nhét utility của Tailwind", () => {
    // Tailwind chỉ quét .ts/.tsx, nên utility nằm trong một chuỗi dưới database
    // không được sinh CSS và sẽ xẹp ở production.
    const html = generateHTML(doc("danger", "x"), extensions);
    expect(html).not.toMatch(/class="[^"]*\b(bg|text|border)-[a-z]+-\d{2,3}\b/);
  });
});

describe("round-trip", () => {
  it("đọc lại kiểu từ data attribute", () => {
    const parsed = nodes(generateHTML(doc("tip", "Mẹo"), extensions));
    expect(parsed[0].type).toBe("callout");
    expect(parsed[0].attrs.variant).toBe("tip");
  });

  it("sống sót qua một vòng render/parse thứ hai", () => {
    const once = generateHTML(doc("note", "Tóm tắt"), extensions);
    expect(generateHTML(generateJSON(once, extensions), extensions)).toBe(once);
  });

  it("hạ một kiểu lạ về note thay vì giữ rác", () => {
    // Không như ngôn ngữ của code block (chỉ là tên class, giữ nguyên là an
    // toàn), kiểu callout ứng với một class có style thật. Một giá trị lạ sẽ
    // ra khối không có nền, trông như hỏng.
    const parsed = nodes('<div data-callout="chartreuse"><p>x</p></div>');
    expect(parsed[0].attrs.variant).toBe("note");
  });

  it("giữ được nhiều đoạn và danh sách bên trong", () => {
    const html = '<div data-callout="note"><p>Một</p><ul><li><p>Hai</p></li></ul></div>';
    const parsed = nodes(html);
    expect(parsed[0].type).toBe("callout");
    expect(generateHTML(generateJSON(html, extensions), extensions)).toContain("<ul>");
  });

  it("không nuốt div thường", () => {
    expect(nodes("<div><p>x</p></div>")[0].type).toBe("paragraph");
  });
});

describe("variant list", () => {
  it("không trùng và note đứng đầu để làm mặc định", () => {
    expect(new Set(CALLOUT_VARIANTS).size).toBe(CALLOUT_VARIANTS.length);
    expect(CALLOUT_VARIANTS[0]).toBe("note");
  });
});
```

**Step 2: Chạy để chắc là nó fail**

Run: `pnpm vitest run components/extensions/callout.test.ts`
Expected: FAIL, `Failed to resolve import "./callout"`.

**Step 3: Viết implementation tối thiểu**

```tsx
// components/extensions/callout.tsx
"use client";

// Via `@tiptap/react`, which re-exports all of `@tiptap/core`: core is only a
// transitive dependency here and is not resolvable as a bare specifier.
import { Node, mergeAttributes } from "@tiptap/react";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

/**
 * Trùng với `type` của components/markdown/note.tsx để bài MDX và bài soạn
 * bằng editor không nói hai thứ tiếng. `note` đứng đầu vì nó là mặc định.
 */
export const CALLOUT_VARIANTS = ["note", "tip", "warning", "danger"] as const;

export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

const DEFAULT_VARIANT: CalloutVariant = "note";

/** Nhãn hiện trong picker của editor. Không lọt xuống HTML đã lưu. */
export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  note: "ghi chú",
  tip: "mẹo",
  warning: "lưu ý",
  danger: "cảnh báo",
};

function toVariant(value: string | null): CalloutVariant {
  // Hạ về mặc định thay vì giữ nguyên giá trị lạ: khác ngôn ngữ của code block
  // (chỉ là tên class, giữ nguyên là an toàn), kiểu callout ứng với một class
  // có style thật, và một giá trị không có style ra khối trông như hỏng.
  return (CALLOUT_VARIANTS as readonly string[]).includes(value ?? "")
    ? (value as CalloutVariant)
    : DEFAULT_VARIANT;
}

function CalloutView({ node, updateAttributes, editor }: NodeViewProps) {
  const variant = toVariant(node.attrs.variant as string | null);

  return (
    <NodeViewWrapper className={`callout callout-${variant}`} data-callout={variant}>
      {/* Ngoài luồng editable, cùng lý do với picker của code block: click vào
          select mà không có cái này thì selection nhảy vào trong khối. */}
      <select
        contentEditable={false}
        suppressContentEditableWarning
        className="callout-picker"
        value={variant}
        disabled={!editor.isEditable}
        aria-label="Kiểu callout"
        onChange={(event) => updateAttributes({ variant: event.target.value })}
      >
        {CALLOUT_VARIANTS.map((name) => (
          <option key={name} value={name}>
            {CALLOUT_LABELS[name]}
          </option>
        ))}
      </select>
      <NodeViewContent className="callout-body" />
    </NodeViewWrapper>
  );
}

/**
 * Một khối được làm nổi bật, kiểu callout của Notion.
 *
 * `content: "block+"` chứ không phải một đoạn văn: một tóm tắt thường có hơn
 * một đoạn, và đôi khi có gạch đầu dòng.
 *
 * Không như link card, khối này không cần JavaScript nào trên đường đọc. Cái
 * `renderHTML` phát ra là cái người đọc nhận, và toàn bộ diện mạo nằm trong
 * `globals.css` dưới các class ngữ nghĩa ở đây. Tailwind chỉ quét `.ts`/`.tsx`
 * nên utility nằm trong một chuỗi dưới database sẽ không được sinh CSS.
 *
 * `variant` đọc lại từ `data-callout`, không từ class: class là chuyện trình
 * bày và có thể đổi tên, data attribute mới là hợp đồng định dạng.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: DEFAULT_VARIANT,
        parseHTML: (element: HTMLElement) => toVariant(element.getAttribute("data-callout")),
        // Tự tay dựng trong renderHTML, nếu không tiptap phát thêm một
        // `variant="note"` lạc lõng ra HTML.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = toVariant(node.attrs.variant as string | null);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: `callout callout-${variant}`,
        "data-callout": variant,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      toggleCallout:
        (variant: CalloutVariant = DEFAULT_VARIANT) =>
        ({ commands }: { commands: { toggleWrap: (name: string, attrs: object) => boolean } }) =>
          commands.toggleWrap(this.name, { variant }),
    } as never;
  },

  addKeyboardShortcuts() {
    // Alt chứ không phải Shift: Mod-Shift-c đã là chuyện của code block trong
    // nhiều editor và người dùng hay gõ nhầm sang.
    return { "Mod-Alt-c": () => (this.editor.commands as never as { toggleCallout: () => boolean }).toggleCallout() };
  },
});
```

Lưu ý: nếu TypeScript kêu về kiểu của `addCommands`, khai báo module augmentation cho `Commands` như tài liệu TipTap thay vì rải `as never`. Người thực hiện được phép dọn chỗ này miễn là test vẫn xanh.

**Step 4: Chạy lại để chắc là nó pass**

Run: `pnpm vitest run components/extensions/callout.test.ts`
Expected: PASS, 9 tests.

**Step 5: Commit**

```bash
git add components/extensions/callout.tsx components/extensions/callout.test.ts
git commit -m "feat: add a callout node stored as semantic markup"
```

---

## Task 10: CSS cho callout

Đây là toàn bộ diện mạo của khối trên trang public, nên làm cẩn thận.

**Files:**
- Modify: `app/globals.css` (thêm sau khối mermaid ở Task 3)

**Step 1: Thêm style**

```css
/* Callout trong bài viết. Đây là toàn bộ diện mạo của khối: `renderHTML` của
   node chỉ phát ra class, không có component nào chạy trên đường đọc. Các biến
   thể chỉ đổi màu viền, nền và ký hiệu, phần còn lại dùng chung. */
.callout {
  @apply relative my-5 rounded-lg border-l-4 border-y border-r py-3 pl-11 pr-4;
}
.callout::before {
  @apply absolute left-4 top-3 text-base leading-6;
  content: "";
}
/* Đoạn đầu và cuối bỏ margin, nếu không prose đẩy chữ lệch khỏi khung. */
.callout > :first-child {
  @apply mt-0;
}
.callout > :last-child {
  @apply mb-0;
}

.callout-note {
  @apply border-border bg-muted/40;
}
.callout-note::before {
  content: "📌";
}
.callout-tip {
  @apply border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40;
}
.callout-tip::before {
  content: "💡";
}
.callout-warning {
  @apply border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40;
}
.callout-warning::before {
  content: "⚠️";
}
.callout-danger {
  @apply border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40;
}
.callout-danger::before {
  content: "🛑";
}

/* Picker chỉ có trong khung soạn thảo. Nó không lọt xuống HTML đã lưu, nên
   quy tắc này không bao giờ khớp gì trên trang public. */
.callout-picker {
  @apply absolute right-2 top-2 z-10 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground outline-none;
}
```

**Step 2: Kiểm Tailwind có sinh class không**

Run: `pnpm build`, rồi `grep -c "callout-warning" .next/static/css/*.css`
Expected: ít nhất 1. Nếu là 0 thì Tailwind không thấy chuỗi `callout-warning`, kiểm lại rằng nó xuất hiện nguyên vẹn trong `.tsx` chứ không bị ghép chuỗi ở chỗ nó chỉ nhìn thấy `callout-${variant}` (các quy tắc trong `globals.css` thì luôn được giữ vì đó là CSS thật, không phải utility cần sinh).

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: add callout variants"
```

---

## Task 11: Nối callout vào editor

**Files:**
- Modify: `components/simple-editor.tsx`

**Step 1: Đăng ký extension**

Trong mảng `extensions` của `useEditor` ([components/simple-editor.tsx:103](components/simple-editor.tsx#L103)), thêm `Callout` ngay sau `LinkCard`, và import nó ở đầu file cạnh `LinkCard`.

**Step 2: Thêm nút vào thanh công cụ**

Ngay sau nút Code Block ([components/simple-editor.tsx:519-526](components/simple-editor.tsx#L519-L526)):

```tsx
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCallout("note").run()}
          isActive={editor.isActive("callout")}
          tooltip="Callout"
        >
          <Lightbulb className="w-4 h-4" />
        </ToolbarButton>
```

Thêm `Lightbulb` vào import từ `lucide-react` ở đầu file.

**Step 3: Kiểm bằng tay**

`pnpm dev`, vào `/admin`, mở một bài nháp:
- Bấm nút Callout: đoạn đang gõ được bọc vào khối có nền và ký hiệu 📌.
- Đổi kiểu trong select ở góc phải: màu và ký hiệu đổi theo.
- Enter xuống dòng trong callout: tạo đoạn mới **bên trong** khối.
- Bấm lại nút Callout: khối bung ra, chữ vẫn còn nguyên.
- Gõ `Mod-Alt-c`: cũng bọc/bung được.
- Lưu bài, F5, mở lại: khối vẫn là callout đúng kiểu, không xẹp thành đoạn thường.

**Step 4: Commit**

```bash
git add components/simple-editor.tsx
git commit -m "feat: add a callout button to the editor toolbar"
```

---

## Task 12: Kiểm callout trên trang đọc

**Step 1:** `pnpm test` và `pnpm lint` xanh.

**Step 2:** Publish bài nháp ở task 11, mở trang `/blog/<slug>`.

Kiểm:
- Bốn kiểu hiện đúng màu ở cả theme sáng và tối.
- Không thấy cái `<select>` nào: picker chỉ tồn tại trong node view của editor.
- Callout có nhiều đoạn và có danh sách bên trong đều nằm gọn trong khung, không có đoạn nào thò margin ra ngoài.
- Callout ngay đầu bài không dính vào tiêu đề, ngay cuối bài không dính vào footer.
- Thu hẹp cửa sổ xuống cỡ điện thoại: khối không tràn ngang.

**Step 3:** Kiểm mục lục vẫn đúng. `tocFromHtml` ở `lib/toc.ts` quét heading; một heading nằm trong callout giờ sẽ được tính. Nếu thấy phiền, đó là lúc quyết định có chặn heading trong `content` của node hay không, nhưng **đừng** sửa trước khi thấy nó thật sự phiền.

---

## Task 13: Cho MDX dùng chung diện mạo callout

Không bắt buộc, nhưng bỏ qua thì bài MDX và bài editor có hai loại callout trông khác nhau.

**Files:**
- Modify: `components/markdown/note.tsx`

**Step 1:** Đổi `Note` sang phát ra đúng markup của `Callout`:

```tsx
import { PropsWithChildren } from "react";
import type { CalloutVariant } from "@/components/extensions/callout";

type NoteProps = PropsWithChildren & {
  title?: string;
  type?: "note" | "danger" | "warning" | "success";
};

// `success` là tên cũ trong các file MDX đã viết; nó là `tip` ở phía callout.
const VARIANT: Record<NonNullable<NoteProps["type"]>, CalloutVariant> = {
  note: "note",
  danger: "danger",
  warning: "warning",
  success: "tip",
};

export default function Note({ children, title = "Note", type = "note" }: NoteProps) {
  const variant = VARIANT[type];
  return (
    <div className={`callout callout-${variant}`} data-callout={variant}>
      {title !== "" && <p className="callout-title">{title}</p>}
      {children}
    </div>
  );
}
```

Thêm vào `globals.css`: `.callout-title { @apply mb-1 font-semibold; }`

**Step 2:** Mở một bài MDX có `<Note>` và so bằng mắt với callout trong bài editor. Hai bên phải trông như nhau.

**Step 3:** `pnpm test` và `pnpm lint` xanh.

**Step 4: Commit**

```bash
git add components/markdown/note.tsx app/globals.css
git commit -m "refactor: give MDX notes the same look as editor callouts"
```

---

## Ngoài phạm vi

Cố ý không làm, ghi ra để khỏi bị lôi vào giữa chừng:

- **Zoom / pan sơ đồ.** Đã hỏi và chọn không cần. `.mermaid-canvas` có `overflow-x: auto` là đủ cho sơ đồ rộng.
- **Render sơ đồ phía server.** mermaid cần DOM thật; làm được nhưng phải nhét một trình duyệt headless vào build, quá đắt so với lợi ích.
- **Bắt click vào node sơ đồ trong bài viết.** Đó là tính năng của trang mindmap, bài viết chỉ cần hình tĩnh.
- **Nút xuất PNG/SVG.** Chưa ai cần.
- **Emoji tự chọn cho callout** như Notion. Bốn kiểu cố định đủ cho việc làm nổi bật tóm tắt; emoji tự do đòi thêm một picker và một chỗ lưu, và làm mỗi khối trông một kiểu.
- **Callout gập lại được.** Cần JavaScript trên đường đọc, tức phải portal như mermaid. Chỉ làm nếu có bài thật cần giấu bớt nội dung.
