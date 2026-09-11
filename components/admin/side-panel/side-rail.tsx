"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PANELS } from "./panels";
import { useSidePanel } from "./side-panel-provider";

export function SideRail() {
  const { panel, toggle } = useSidePanel();

  return (
    // display comes from app/admin/layout.tsx, not a class here: the rail is
    // hidden until html.is-admin and below 768px. z-57, one above the panel:
    // see the tooltip below.
    <nav
      aria-label="Lịch, task và ghi nhanh"
      className="admin-side-rail focus-mode-hidden fixed bottom-0 right-0 top-9 z-[57] w-12 flex-col items-center gap-1 border-l bg-background py-2"
    >
      {PANELS.map(({ id, label, shortcut, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-label={label}
              aria-pressed={panel === id}
              aria-keyshortcuts={shortcut}
              data-panel={id}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                panel === id && "bg-muted text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          {/* components/ui/tooltip.tsx does not portal, so this paints inside
              the rail's stacking context. That is why the rail sits one above
              the panel (z-57 over z-56): otherwise an open panel covers it. */}
          <TooltipContent side="left" className="z-[70]">
            {label} <span className="ml-1 font-mono text-[10px] text-muted-foreground">{shortcut}</span>
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}
