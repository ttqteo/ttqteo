"use client";

import { useState, useEffect } from "react";
import {
  Lightbulb,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MindmapHelpModal } from "./help-modal";

const TIPS = [
  {
    title: "Quick Edit",
    text: "Click vào node để sửa siêu nhanh.",
    shortcuts: ["Click"],
  },
  {
    title: "Navigation",
    text: "Di chuyển nhanh giữa các node.",
    shortcuts: ["Alt", "Arrows"],
  },
  {
    title: "New Nodes",
    text: "Enter để thêm sibling, Tab để thêm child.",
    shortcuts: ["Enter", "Tab"],
  },
  {
    title: "Fast Styling",
    text: "Gõ ! ở đầu để tạo node Cảnh báo.",
    shortcuts: ["!"],
  },
  {
    title: "Collapse",
    text: "Click vào chấm tròn cạnh node để thu gọn.",
    shortcuts: ["Click •"],
  },
  {
    title: "Smart Keywords",
    text: "Dùng 'ví dụ', 'lưu ý' để tự động đổi màu.",
  },
];

export function SidebarTips() {
  const [tipIndex, setTipIndex] = useState(0);
  const [isAnimate, setIsAnimate] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-tips-collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-tips-collapsed", String(newState));
    }
  };

  const nextTip = () => {
    setIsAnimate(true);
    setTimeout(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
      setIsAnimate(false);
    }, 300);
  };

  useEffect(() => {
    if (isCollapsed) return; // Don't auto-rotate when collapsed
    const interval = setInterval(nextTip, 10000);
    return () => clearInterval(interval);
  }, [isCollapsed]);

  const currentTip = TIPS[tipIndex];

  return (
    <div className="px-4 py-4 space-y-3">
      <div
        className="flex items-center justify-between mb-1 cursor-pointer group"
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-2 text-[11px] font-bold text-primary/80 uppercase tracking-widest">
          <Sparkles className="h-3 w-3" />
          Pro Tips
          {isCollapsed ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <MindmapHelpModal />
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div
            className="group relative bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 rounded-xl p-3 cursor-pointer hover:border-primary/30 transition-all duration-300"
            onClick={nextTip}
          >
            <div
              className={`space-y-2 transition-all duration-300 ${
                isAnimate
                  ? "opacity-0 translate-x-2"
                  : "opacity-100 translate-x-0"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 bg-primary/20 p-1.5 rounded-lg text-primary">
                  <Lightbulb className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[12px] font-semibold text-foreground/90 leading-tight">
                    {currentTip.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {currentTip.text}
                  </p>
                </div>
              </div>

              {currentTip.shortcuts && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentTip.shortcuts.map((s, i) => (
                    <kbd
                      key={i}
                      className="px-1.5 py-0.5 bg-background border rounded text-[9px] font-sans font-medium text-muted-foreground shadow-sm"
                    >
                      {s}
                    </kbd>
                  ))}
                </div>
              )}
            </div>

            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-3 w-3 text-primary animate-pulse" />
            </div>
          </div>

          <div className="flex justify-center gap-1">
            {TIPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === tipIndex ? "w-4 bg-primary" : "w-1 bg-primary/20"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
