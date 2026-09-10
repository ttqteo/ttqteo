"use client";

import { CURRENT_BUILD_ID, isNewerBuild } from "@/lib/build-version";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Quiet enough to be free, often enough that a long-open tab notices. */
const POLL_MS = 15 * 60 * 1000;

/**
 * Tells a tab that has been open across a deploy that the site has moved on,
 * and offers to reload.
 *
 * Deliberately not a service worker. What was asked for is version detection
 * and a reload button; a service worker's own reason to exist is offline
 * support, and installing one puts a caching layer in front of every request
 * on a site that has none today — which is how "why am I still seeing the old
 * post" bugs start. This asks the server what it is running and compares.
 *
 * Never forces the reload. A reader mid-article, or an author mid-draft, is
 * the last person who should have the page pulled out from under them.
 */
export function UpdatePrompt() {
  const notified = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Nothing to compare against, and a hidden tab does not need telling.
      if (CURRENT_BUILD_ID === "unknown" || document.hidden) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = (await res.json()) as { buildId?: string };
        if (cancelled || !isNewerBuild(buildId)) return;
        // One prompt per deploy: re-toasting the same build every poll would
        // turn a helpful notice into something to dismiss on a timer.
        if (notified.current === buildId) return;
        notified.current = buildId ?? null;

        toast("Có bản mới của trang", {
          description: "Tải lại để dùng bản mới nhất.",
          duration: Infinity,
          action: {
            label: "Tải lại",
            onClick: () => window.location.reload(),
          },
        });
      } catch {
        // Offline, or the deploy is mid-swap. Either way the next check covers
        // it; a failed version check is not worth telling anyone about.
      }
    }

    const timer = window.setInterval(check, POLL_MS);
    // Coming back to a tab is when a deploy is most likely to have happened
    // since you last looked, and it costs one request.
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
