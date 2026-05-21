"use client";

import { getReaderResume } from "@/lib/resume-storage";
import { useEffect } from "react";

type Props = { slug: string };

const PENDING_KEY = "ttqteo:resume-pending";

export function markResumePending() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

function consumePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.sessionStorage.getItem(PENDING_KEY) === "1";
    if (v) window.sessionStorage.removeItem(PENDING_KEY);
    return v;
  } catch {
    return false;
  }
}

export function ScrollRestorer({ slug }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pending = consumePending();
    const entry = getReaderResume();
    if (!entry || entry.slug !== slug) return;
    if (!pending && window.location.hash) return;

    let cancelled = false;
    const start = Date.now();
    const deadline = 2500;
    let lastTargetY = -1;
    let stableCount = 0;

    const HEADING_OFFSET = 80;
    const computeTargetY = (): number | null => {
      if (entry.headingId) {
        const el = document.getElementById(entry.headingId);
        if (el) {
          const rect = el.getBoundingClientRect();
          return Math.max(0, rect.top + window.scrollY - HEADING_OFFSET);
        }
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 100) return entry.scrollPct * max;
      return null;
    };

    const tick = () => {
      if (cancelled) return;
      const target = computeTargetY();
      if (target !== null) {
        if (Math.abs(target - lastTargetY) < 2) {
          stableCount++;
        } else {
          stableCount = 0;
          lastTargetY = target;
        }
        if (Math.abs(window.scrollY - target) > 2) {
          window.scrollTo({ top: target, behavior: "auto" });
        }
        if (stableCount >= 3) return;
      }
      if (Date.now() - start < deadline) {
        window.setTimeout(tick, 150);
      }
    };

    const t = window.setTimeout(tick, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [slug]);

  return null;
}
