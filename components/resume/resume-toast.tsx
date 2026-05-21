"use client";

import { cn } from "@/lib/utils";
import { ArrowRightIcon, XIcon, type LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  accent: "reader" | "writer";
  label: string;
  title: string;
  cta: string;
  onContinue: () => void;
  onDismiss: () => void;
};

const ACCENT = {
  writer: {
    border: "border-l-4 border-l-amber-500",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  reader: {
    border: "border-l-4 border-l-sky-500",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
} as const;

export function ResumeToast({
  icon: Icon,
  accent,
  label,
  title,
  cta,
  onContinue,
  onDismiss,
}: Props) {
  const a = ACCENT[accent];
  return (
    <div
      className={cn(
        "w-[min(20rem,calc(100vw-2rem))]",
        "rounded-md border bg-background/95 backdrop-blur shadow-lg",
        "pl-3 pr-7 py-3 text-sm",
        "animate-in fade-in slide-in-from-left-4 duration-300",
        "relative flex gap-3",
        a.border,
      )}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng"
        className="absolute top-1.5 right-1.5 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
          a.iconBg,
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">
          {label}
        </div>
        <div className="font-medium leading-snug mb-1.5 line-clamp-2">{title}</div>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-start gap-1 text-left text-xs text-primary hover:underline"
        >
          <span className="line-clamp-2">{cta}</span>
          <ArrowRightIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
