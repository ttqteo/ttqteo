"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Nút icon trong các bubble của editor. `label` vừa là tên cho trình đọc màn
 * hình vừa là chữ trong tooltip; `shortcut` chỉ thêm vào tooltip.
 */
export function BubbleButton({
  label,
  shortcut,
  onClick,
  disabled,
  active,
  destructive,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-7 w-7 p-0",
            destructive && "text-destructive hover:text-destructive",
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
        >
          {children}
        </Button>
      </TooltipTrigger>
      {/* Dưới chứ không trên: bubble hay nằm sát header dính của trang soạn. */}
      <TooltipContent side="bottom" sideOffset={5}>
        {shortcut ? `${label} (${shortcut})` : label}
      </TooltipContent>
    </Tooltip>
  );
}
