"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  const reset = () => {
    // Bấm lần thứ hai trong 1.5s mà chỉ ghi đè `timer.current` thì hẹn giờ cũ
    // vẫn chạy và trả nhãn về "copy" sớm hơn hạn của lần bấm mới.
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopyLabel(COPY), 1500);
  };

  const copy = () => {
    // Safari cũ và mọi origin không bảo mật đều không có clipboard API; nói
    // thẳng ra hơn là một cái nút trông như đã chạy.
    const done = navigator.clipboard?.writeText(source);
    if (!done) {
      // Nhánh này cũng phải hẹn giờ, nếu không nút đứng nguyên chữ "lỗi" mãi.
      setCopyLabel(FAILED);
      reset();
      return;
    }
    done.then(
      () => setCopyLabel(COPIED),
      () => setCopyLabel(FAILED),
    );
    reset();
  };

  const asSource = showSource || error !== null;
  // Cùng lý do với `inner` của post-html.tsx: React 19 so sánh prop bằng
  // identity, nên một object `{ __html }` mới ở mỗi lần render bắt nó ghi lại
  // innerHTML, và bấm copy sẽ dựng lại toàn bộ sơ đồ.
  const inner = useMemo(() => ({ __html: svg ?? "" }), [svg]);

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
        <div className="mermaid-canvas" dangerouslySetInnerHTML={inner} />
      ) : (
        <div className="mermaid-skeleton">đang vẽ sơ đồ…</div>
      )}

      {error !== null && <p className="mermaid-error">sơ đồ lỗi: {error}</p>}
    </div>
  );
}
