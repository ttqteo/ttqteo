"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ArrowUp, Check, PanelRight, Type } from "lucide-react";
import { PropsWithChildren, useEffect, useState } from "react";

export type ReaderFont = "sans" | "serif";
export type ReaderSize = "sm" | "base" | "lg" | "xl";

type Prefs = {
  font: ReaderFont;
  size: ReaderSize;
  tocVisible: boolean;
};

const DEFAULTS: Prefs = { font: "serif", size: "lg", tocVisible: true };
const STORAGE_KEY = "reader-prefs";
const EVENT = "reader-prefs-change";

function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function writePrefs(next: Prefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT));
}

function usePrefs(): Prefs {
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  useEffect(() => {
    setPrefs(readPrefs());
    const sync = () => setPrefs(readPrefs());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return prefs;
}

const FONT_CLASS: Record<ReaderFont, string> = {
  sans: "font-sans",
  serif: "font-serif",
};

const SIZE_PX: Record<ReaderSize, string> = {
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
};

const FONT_LABEL: Record<ReaderFont, string> = {
  sans: "Sans (Inter)",
  serif: "Serif (Newsreader)",
};

const SIZE_LABEL: Record<ReaderSize, string> = {
  sm: "Small",
  base: "Normal",
  lg: "Large",
  xl: "X-Large",
};

export function ReaderControlsBar({ hasToc }: { hasToc: boolean }) {
  const prefs = usePrefs();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function update(patch: Partial<Prefs>) {
    writePrefs({ ...prefs, ...patch });
  }

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2" aria-label="Reader settings">
            <Type className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs font-mono text-muted-foreground">
            Font
          </DropdownMenuLabel>
          {(Object.keys(FONT_LABEL) as ReaderFont[]).map((f) => (
            <DropdownMenuItem
              key={f}
              onClick={() => update({ font: f })}
              className="justify-between"
            >
              <span className={FONT_CLASS[f]}>{FONT_LABEL[f]}</span>
              {prefs.font === f && <Check className="w-3.5 h-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-mono text-muted-foreground">
            Size
          </DropdownMenuLabel>
          {(Object.keys(SIZE_LABEL) as ReaderSize[]).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => update({ size: s })}
              className="justify-between"
            >
              <span>{SIZE_LABEL[s]}</span>
              {prefs.size === s && <Check className="w-3.5 h-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasToc && (
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 px-2", prefs.tocVisible && "text-primary")}
          onClick={() => update({ tocVisible: !prefs.tocVisible })}
          aria-label="Toggle table of contents"
          aria-pressed={prefs.tocVisible}
        >
          <PanelRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export function ReaderContent({ children }: PropsWithChildren) {
  const prefs = usePrefs();
  return (
    <div
      data-reader-content
      className={cn("reader-content", FONT_CLASS[prefs.font])}
      style={
        {
          "--reader-fs": SIZE_PX[prefs.size],
          fontSize: SIZE_PX[prefs.size],
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className={cn(
        "fixed bottom-6 right-6 z-40 inline-flex items-center justify-center",
        "h-10 w-10 rounded-full border border-border bg-background shadow-md",
        "text-muted-foreground hover:text-primary hover:border-primary",
        "transition-all duration-200",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none",
      )}
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}

export function ReaderSidebar({
  children,
  hasToc,
}: PropsWithChildren<{ hasToc: boolean }>) {
  const prefs = usePrefs();
  const expanded = hasToc && prefs.tocVisible;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.tocExpanded = expanded ? "1" : "0";
  }, [expanded]);

  useEffect(() => {
    const root = document.documentElement;
    const id = requestAnimationFrame(() => {
      root.dataset.readerHydrated = "1";
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      data-has-toc={hasToc ? "1" : "0"}
      className={cn(
        "blog-sidebar hidden lg:flex flex-col shrink-0 self-start sticky top-16 h-[calc(100vh-4rem)] py-3",
      )}
    >
      <div className="h-11 shrink-0" aria-hidden />
      <div className="blog-toc-panel flex-1 min-h-0 flex flex-col">
        <div className="w-[220px] h-full flex flex-col">{children}</div>
      </div>
    </div>
  );
}

export function ReaderControlsAnchor({ hasToc }: { hasToc: boolean }) {
  return (
    <div
      className="hidden lg:flex absolute top-0 right-4 h-full pointer-events-none"
      aria-hidden={false}
    >
      <div className="sticky top-16 h-fit pt-9 pointer-events-auto">
        <ReaderControlsBar hasToc={hasToc} />
      </div>
    </div>
  );
}
