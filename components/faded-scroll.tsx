"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";

type Edges = { top: boolean; bottom: boolean };

export function FadedScroll({
  children,
  className,
  fadeSize = 32,
}: PropsWithChildren<{ className?: string; fadeSize?: number }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<Edges>({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const overflow = scrollHeight - clientHeight > 1;
      setEdges({
        top: overflow && scrollTop > 1,
        bottom: overflow && scrollTop + clientHeight < scrollHeight - 1,
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const top = edges.top ? `transparent 0, black ${fadeSize}px` : "black 0";
  const bottom = edges.bottom
    ? `black calc(100% - ${fadeSize}px), transparent 100%`
    : "black 100%";
  const mask = `linear-gradient(to bottom, ${top}, ${bottom})`;

  return (
    <div
      ref={ref}
      className={`scrollbar-hidden ${className ?? ""}`}
      style={{ overflowY: "auto", maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </div>
  );
}
