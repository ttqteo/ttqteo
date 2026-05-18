"use client";

import { cn } from "@/lib/utils";
import GithubSlugger from "github-slugger";
import { useEffect, useMemo, useRef, useState } from "react";

type Heading = { level: number; text: string; id: string };

function extractHeadings(html: string): Heading[] {
  if (typeof window === "undefined") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  doc.querySelectorAll("h1, h2, h3").forEach((el) => {
    const text = (el.textContent ?? "").trim();
    if (!text) return;
    const level = Number(el.tagName.substring(1));
    out.push({ level, text, id: slugger.slug(text) });
  });
  return out;
}

export function EditorToc({
  content,
  scrollRoot,
}: {
  content: string;
  scrollRoot?: HTMLElement | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const headings = useMemo(
    () => (mounted ? extractHeadings(content) : []),
    [content, mounted],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const lockUntilRef = useRef(0);


  // Scroll-spy: pick the last heading whose top has passed the activation line.
  // Use capture-phase scroll on document so it fires regardless of which
  // element actually scrolls (window vs. internal container).
  useEffect(() => {
    if (headings.length === 0) return;
    let raf = 0;
    const ACTIVATE_AT = 220;

    const compute = () => {
      raf = 0;
      if (Date.now() < lockUntilRef.current) return;

      // Match TOC headings to live DOM headings by sequence + text.
      // Slug-based getElementById is unreliable because TipTap re-renders
      // strip our injected ids.
      const editorRoot = document.querySelector(".ProseMirror");
      if (!editorRoot) return;
      const liveNodes = Array.from(
        editorRoot.querySelectorAll<HTMLElement>("h1, h2, h3"),
      );
      if (liveNodes.length === 0) return;

      const pairs: { id: string; el: HTMLElement }[] = [];
      let cursor = 0;
      for (const h of headings) {
        while (cursor < liveNodes.length) {
          const node = liveNodes[cursor++];
          const tag = `h${h.level}`;
          if (
            node.tagName.toLowerCase() === tag &&
            (node.textContent ?? "").trim() === h.text
          ) {
            pairs.push({ id: h.id, el: node });
            break;
          }
        }
      }
      if (pairs.length === 0) return;

      let currentId: string | null = null;
      for (const { id, el } of pairs) {
        if (el.getBoundingClientRect().top <= ACTIVATE_AT) currentId = id;
        else break;
      }
      if (!currentId) {
        const first = pairs[0];
        if (first && first.el.getBoundingClientRect().top < window.innerHeight) {
          currentId = first.id;
        }
      }
      if (currentId) {
        setActiveId((prev) => (prev === currentId ? prev : currentId));
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };

    const init = requestAnimationFrame(compute);
    // Capture so any scroll (window, container, iframe...) bubbles up
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(init);
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  const onClick = (heading: Heading) => {
    // Find live DOM heading by walking ProseMirror in document order and
    // picking the Nth occurrence of this {level, text} pair.
    const editorRoot = document.querySelector(".ProseMirror");
    if (!editorRoot) return;
    const liveNodes = Array.from(
      editorRoot.querySelectorAll<HTMLElement>("h1, h2, h3"),
    );

    // Determine which occurrence of this heading we're targeting in `headings`
    const occurrenceIndex = headings
      .filter((h) => h.level === heading.level && h.text === heading.text)
      .indexOf(heading);

    let el: HTMLElement | null = null;
    let seen = 0;
    for (const node of liveNodes) {
      if (
        node.tagName.toLowerCase() === `h${heading.level}` &&
        (node.textContent ?? "").trim() === heading.text
      ) {
        if (seen === occurrenceIndex) {
          el = node;
          break;
        }
        seen++;
      }
    }
    if (!el) return;
    // Long initial lock; we'll release early when scroll settles.
    lockUntilRef.current = Date.now() + 1500;
    setActiveId(heading.id);
    const OFFSET = 200;

    // Watch scroll position; once it stops moving, release the lock.
    let lastY = -1;
    let stableFrames = 0;
    const release = () => {
      const y =
        (typeof window !== "undefined" ? window.scrollY : 0) +
        // Also consider any internal scroll container
        (document.querySelector(".ProseMirror")
          ?.closest<HTMLElement>("[data-edit-scroll]")?.scrollTop ?? 0);
      if (Math.abs(y - lastY) < 1) {
        stableFrames += 1;
        if (stableFrames >= 5) {
          lockUntilRef.current = 0;
          return;
        }
      } else {
        stableFrames = 0;
      }
      lastY = y;
      if (Date.now() < lockUntilRef.current + 500) {
        requestAnimationFrame(release);
      } else {
        lockUntilRef.current = 0;
      }
    };
    requestAnimationFrame(release);

    // Find the nearest scrollable ancestor (handles internal scroll containers)
    const findScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let cur: HTMLElement | null = node?.parentElement ?? null;
      while (cur && cur !== document.body) {
        const s = getComputedStyle(cur);
        if (
          /(auto|scroll|overlay)/.test(s.overflowY) &&
          cur.scrollHeight > cur.clientHeight
        ) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return window;
    };

    const target = el as HTMLElement;
    const scroller = findScrollParent(target);
    if (scroller === window) {
      const top =
        target.getBoundingClientRect().top + window.scrollY - OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      const container = scroller as HTMLElement;
      const top =
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        OFFSET;
      container.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (headings.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/60 italic">
        Chưa có heading nào trong bài viết
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      {headings.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => onClick(h)}
          className={cn(
            "text-left transition-colors hover:text-primary leading-snug",
            h.level === 1 && "pl-0",
            h.level === 2 && "pl-3",
            h.level === 3 && "pl-6 text-xs",
            activeId === h.id
              ? "text-primary font-medium"
              : "text-muted-foreground",
          )}
        >
          {h.text}
        </button>
      ))}
    </div>
  );
}
