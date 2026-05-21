"use client";

import { setReaderResume } from "@/lib/resume-storage";
import { useEffect, useRef } from "react";

type Props = {
  slug: string;
  title: string;
};

const MIN_PCT = 0.05;
const THROTTLE_MS = 1000;

function computeProgress() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  return pct;
}

function findCurrentHeading(): { id: string; text: string } | undefined {
  const scope = document.querySelector("article") ?? document.body;
  const headings = Array.from(
    scope.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id]"),
  );
  if (headings.length === 0) return undefined;
  const threshold = 80;
  let current: HTMLElement | undefined;
  for (const h of headings) {
    const top = h.getBoundingClientRect().top;
    if (top - threshold <= 0) current = h;
    else break;
  }
  if (!current) return undefined;
  return { id: current.id, text: current.textContent?.trim() ?? "" };
}

export function ReaderProgressTracker({ slug, title }: Props) {
  const lastWriteRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const persist = () => {
      const pct = computeProgress();
      if (pct < MIN_PCT) return;
      const heading = findCurrentHeading();
      setReaderResume({
        slug,
        title,
        scrollPct: pct,
        headingId: heading?.id,
        headingText: heading?.text,
        updatedAt: Date.now(),
      });
    };

    const onScroll = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < THROTTLE_MS) return;
      lastWriteRef.current = now;
      persist();
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    const onHide = () => {
      if (!cancelled) persist();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      persist();
    };
  }, [slug, title]);

  return null;
}
