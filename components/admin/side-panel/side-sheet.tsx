"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PanelBody } from "./panel-body";
import { PANELS } from "./panels";
import { useSidePanel } from "./side-panel-provider";

/** Rail and panel in one, for screens under 768px where a 48px rail does not fit. */
export function SideSheet() {
  const { sheetOpen, setSheetOpen, sheetTab, setSheetTab } = useSidePanel();

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="flex h-[85dvh] flex-col gap-0 p-0 md:hidden"
      >
        <SheetTitle className="sr-only">Lịch, task và ghi nhanh</SheetTitle>
        {/* Toggle buttons like the rail's. mr-12 leaves the sheet's own close
            button its corner. */}
        <div className="mr-12 flex gap-1 border-b p-2">
          {PANELS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={sheetTab === id}
              onClick={() => setSheetTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm text-muted-foreground transition-colors",
                sheetTab === id && "bg-muted text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {/* No autofocus: on a phone it would pull the keyboard up over the
            sheet every time it opens, even just to look. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PanelBody id={sheetTab} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
