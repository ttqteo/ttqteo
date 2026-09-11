"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PANELS } from "./panels";
import { useSidePanel } from "./side-panel-provider";

export function SideRail() {
  const { panel, toggle } = useSidePanel();

  return (
    // display comes from app/admin/layout.tsx, not a class here: the rail is
    // hidden until html.is-admin and below 768px.
    <nav
      aria-label="Lịch, task và ghi nhanh"
      className="admin-side-rail focus-mode-hidden fixed bottom-0 right-0 top-9 z-[56] w-12 flex-col items-center gap-1 border-l bg-background py-2"
    >
      {PANELS.map(({ id, label, shortcut, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-label={label}
              aria-pressed={panel === id}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                panel === id && "bg-muted text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          {/* Above the rail itself (z-56). */}
          <TooltipContent side="left" className="z-[70]">
            {label} <span className="ml-1 font-mono text-[10px] text-muted-foreground">{shortcut}</span>
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}
