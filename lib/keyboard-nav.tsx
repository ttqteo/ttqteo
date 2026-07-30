"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, string> = {
  h: "/",
  p: "/projects",
  b: "/blog",
  l: "/lab",
  a: "/about",
};

export function KeyboardNav() {
  const router = useRouter();

  useEffect(() => {
    let waitingForSecondKey = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function isInInput(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        el.isContentEditable === true
      );
    }

    function handler(e: KeyboardEvent) {
      if (isInInput(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (!waitingForSecondKey) {
        if (e.key === "g") {
          waitingForSecondKey = true;
          timer = setTimeout(() => {
            waitingForSecondKey = false;
          }, 1000);
        }
        return;
      }

      const target = ROUTES[e.key.toLowerCase()];
      if (target) {
        e.preventDefault();
        router.push(target);
      }
      waitingForSecondKey = false;
      if (timer) clearTimeout(timer);
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return null;
}
