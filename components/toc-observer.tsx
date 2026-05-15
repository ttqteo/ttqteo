"use client";

import { getDocsTocs } from "@/lib/markdown";
import clsx from "clsx";
import { useState, useRef, useEffect } from "react";

type Props = { data: Awaited<ReturnType<typeof getDocsTocs>> };

export default function TocObserver({ data }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lockUntilRef = useRef<number>(0);
  const lockedTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      if (Date.now() < lockUntilRef.current) return;
      const visibleEntry = entries.find((entry) => entry.isIntersecting);
      if (visibleEntry) {
        setActiveId(visibleEntry.target.id);
      }
    };

    observer.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "-20px 0px 0px 0px",
      threshold: 0.1,
    });

    const elements = data.map((item) =>
      document.getElementById(item.href.slice(1))
    );

    elements.forEach((el) => {
      if (el && observer.current) {
        observer.current.observe(el);
      }
    });

    return () => {
      if (observer.current) {
        elements.forEach((el) => {
          if (el) {
            observer.current!.unobserve(el);
          }
        });
      }
    };
  }, [data]);

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();

    lockedTargetRef.current = id;
    lockUntilRef.current = Date.now() + 1000;
    setActiveId(id);

    el.scrollIntoView({ behavior: "smooth", block: "start" });

    if (history.replaceState) {
      history.replaceState(null, "", href);
    }

    let lastY = window.scrollY;
    let stableCount = 0;
    const check = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 1) {
        stableCount += 1;
        if (stableCount >= 3) {
          lockUntilRef.current = 0;
          lockedTargetRef.current = null;
          return;
        }
      } else {
        stableCount = 0;
      }
      lastY = y;
      if (Date.now() < lockUntilRef.current + 500) {
        requestAnimationFrame(check);
      } else {
        lockUntilRef.current = 0;
        lockedTargetRef.current = null;
      }
    };
    requestAnimationFrame(check);
  };

  return (
    <div className="flex flex-col gap-2.5 text-sm dark:text-stone-300/85 text-stone-800 ml-0.5">
      {data.map(({ href, level, text }, index) => {
        return (
          <a
            key={href + text + level + index}
            href={href}
            onClick={(e) => handleClick(e, href)}
            className={clsx("transition-colors hover:text-primary", {
              "pl-0": level == 1 || level == 2,
              "pl-4": level == 3,
              "pl-8 ": level == 4,
              "dark:font-medium font-semibold text-primary":
                activeId == href.slice(1),
            })}
          >
            {text}
          </a>
        );
      })}
    </div>
  );
}
