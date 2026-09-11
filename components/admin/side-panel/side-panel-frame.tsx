"use client";

import { XIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import { PanelBody } from "./panel-body";
import { panelMeta } from "./panels";
import { useSidePanel } from "./side-panel-provider";

export function SidePanelFrame() {
  const { panel, openedByUser, close } = useSidePanel();
  const meta = panel ? panelMeta(panel) : null;

  // Only for keys pressed inside the panel itself. A popover opened from it
  // is portalled elsewhere in the DOM but still bubbles here through React,
  // and its Escape should close the popover, not the panel.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && event.currentTarget.contains(event.target as Node)) close();
  };

  return (
    // Shown by CSS off html[data-admin-panel] (app/admin/layout.tsx), so the
    // frame is there from first paint and its content follows hydration.
    <aside
      aria-label={meta?.label}
      onKeyDown={onKeyDown}
      className="admin-side-panel focus-mode-hidden fixed bottom-0 right-12 top-9 z-[56] w-[360px] flex-col border-l bg-background shadow-xl xl:shadow-none"
    >
      {meta && (
        <>
          <header className="flex h-11 shrink-0 items-center justify-between border-b px-3">
            <h2 className="text-sm font-medium">{meta.label}</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Đóng panel"
              title="Đóng (Esc)"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PanelBody id={meta.id} autoFocus={openedByUser} />
          </div>
        </>
      )}
    </aside>
  );
}
