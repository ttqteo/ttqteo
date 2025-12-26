"use client";

import { useState } from "react";
import { ChevronsRight, ChevronsLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIPS = [
  "Click vào node để sửa • **Alt + Arrows** = di chuyển • **Enter** = sibling • **Tab** = child",
  "Dùng **Alt + Arrows** để điều hướng nhanh giữa các node cùng cấp hoặc cha/con.",
  "Gõ **!** hoặc **⚠️** ở đầu văn bản để biến node thành cảnh báo (Warning).",
  "Các từ khóa **'ví dụ'**, **'lưu ý'**, **'ghi chú'**... sẽ tự động đổi style node.",
  "Chế độ **Learning** (Học tập) hiển thị node theo dạng khối học thuật.",
  "Chế độ **Thinking** lược bỏ khung để bạn tập trung vào luồng suy nghĩ.",
  "Bạn có thể thu gọn nhánh bằng cách click vào nút tròn màu ở cạnh node.",
  "Node ở cấp 1 (ngay sau Root) trong chế độ Learning sẽ luôn có khung viền rõ.",
];

export function MindmapTips() {
  const [tipIndex, setTipIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const nextTip = () => {
    setTipIndex((prev) => (prev + 1) % TIPS.length);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Improved markdown-ish bold and kbd renderer
  const renderTip = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <kbd
            key={i}
            className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-sans font-medium text-foreground dark:text-white dark:bg-zinc-800 shadow-sm border border-border dark:border-zinc-700 mx-0.5"
          >
            {part.slice(2, -2)}
          </kbd>
        );
      }
      return (
        <span key={i} className="text-foreground dark:text-zinc-100 italic">
          {part}
        </span>
      );
    });
  };

  return (
    <div
      className={`flex items-center gap-1 transition-all duration-300 ease-in-out ${
        isExpanded ? "pr-2" : "pr-0"
      }`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-accent shrink-0 transition-transform"
        onClick={toggleExpand}
        title={isExpanded ? "Thu gọn mẹo" : "Mở rộng mẹo & phím tắt"}
      >
        {isExpanded ? (
          <ChevronsLeft className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ChevronsRight className="h-3.5 w-3.5 text-primary" />
        )}
      </Button>

      <div
        className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded
            ? "max-w-[500px] opacity-100 ml-1"
            : "max-w-0 opacity-0 ml-0"
        }`}
      >
        <div
          className="text-[11px] leading-none cursor-pointer hover:opacity-80 flex items-center whitespace-nowrap"
          onClick={nextTip}
          title="Bấm để xem mẹo tiếp theo"
        >
          {renderTip(TIPS[tipIndex])}
        </div>
      </div>
    </div>
  );
}
