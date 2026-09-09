"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { isMermaidPre } from "@/lib/mermaid";

const COPY = "copy";
const COPIED = "đã copy";
const FAILED = "lỗi";
const LANGUAGE_PREFIX = "language-";

type Slot = { key: string; container: HTMLElement; source: string };

/**
 * Editor-authored posts are stored as an HTML string and rendered straight into
 * the page, so there is no React on the read path and no per-block component to
 * hang a copy button off. This walks the rendered markup instead and wraps each
 * `<pre>` in a bar carrying its language and a copy button.
 *
 * MDX posts do not come through here — they render as real components and get
 * their button from `components/markdown/pre.tsx` — so the two cannot double up.
 */
export function PostHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  // React 19 so sánh prop bằng identity, nên một object `{ __html }` mới ở
  // mỗi lần render là đủ để nó ghi lại `innerHTML` và xoá sạch những gì
  // effect vừa dựng. Giữ nguyên object thì lần render do `setSlots` gây ra
  // không đụng tới DOM nữa.
  const inner = useMemo(() => ({ __html: html }), [html]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const timers: number[] = [];

    root.querySelectorAll("pre").forEach((pre) => {
      // React replaces this whole subtree when `html` changes, so a shell can
      // only be left over within a single pass; this guards a re-run.
      if (pre.parentElement?.classList.contains("code-shell")) return;

      // Một sơ đồ không phải khối code: `<pre>` bị thay bằng một container rỗng
      // để React portal component vào. Làm trước phần copy button, vì sơ đồ tự
      // dựng thanh của nó.
      if (isMermaidPre(pre)) {
        const source = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        const container = document.createElement("div");
        container.className = "mermaid-slot";
        container.dataset.mermaidSource = source;
        pre.replaceWith(container);
        return;
      }

      const code = pre.querySelector("code");
      const language =
        Array.from(code?.classList ?? [])
          .find((name) => name.startsWith(LANGUAGE_PREFIX))
          ?.slice(LANGUAGE_PREFIX.length) ?? "";

      const shell = document.createElement("div");
      shell.className = "code-shell";

      const bar = document.createElement("div");
      bar.className = "code-shell-bar";

      const label = document.createElement("span");
      label.className = "code-shell-lang";
      label.textContent = language || "code";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-shell-copy";
      button.textContent = COPY;
      button.addEventListener("click", () => {
        const text = code?.textContent ?? pre.textContent ?? "";
        // Older Safari and any non-secure origin have no clipboard API; saying
        // so beats a button that looks like it worked.
        const done = navigator.clipboard?.writeText(text);
        if (!done) {
          button.textContent = FAILED;
          return;
        }
        done.then(
          () => {
            button.textContent = COPIED;
            timers.push(
              window.setTimeout(() => {
                button.textContent = COPY;
              }, 1500),
            );
          },
          () => {
            button.textContent = FAILED;
            timers.push(
              window.setTimeout(() => {
                button.textContent = COPY;
              }, 1500),
            );
          },
        );
      });

      bar.append(label, button);
      pre.before(shell);
      shell.append(bar, pre);
    });

    // Đọc lại từ DOM chứ không thu trong vòng lặp trên: dưới StrictMode effect
    // chạy hai lần trên cùng một DOM, và lần hai không còn `<pre>` mermaid nào
    // để tìm vì lần một đã thay chúng bằng container. Nguồn sự thật là
    // container.
    const found: Slot[] = Array.from(
      root.querySelectorAll<HTMLElement>(".mermaid-slot"),
    ).map((container, index) => ({
      key: `mermaid-${index}`,
      container,
      source: container.dataset.mermaidSource ?? "",
    }));

    // Gần như mọi bài đều không có sơ đồ nào, nên chỉ đặt state khi thật sự
    // tìm được, tránh bắt chúng trả giá một lần render thừa.
    if (found.length > 0) setSlots(found);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      // Khi `html` đổi, React dựng lại toàn bộ subtree và mọi container ở trên
      // bị tháo khỏi document. Bỏ slot cũ đi trước khi effect mới chạy, nếu
      // không portal sẽ trỏ vào node đã mồ côi.
      setSlots((prev) => (prev.length > 0 ? [] : prev));
    };
  }, [html]);

  return (
    <>
      <div ref={ref} dangerouslySetInnerHTML={inner} />
      {slots.map((slot) =>
        createPortal(<MermaidDiagram source={slot.source} />, slot.container, slot.key),
      )}
    </>
  );
}
