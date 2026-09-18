"use client";

import type { PropsWithChildren } from "react";
import { SidePanelFrame } from "./side-panel-frame";
import { SidePanelProvider } from "./side-panel-provider";
import { SideRail } from "./side-rail";
import { SideSheet } from "./side-sheet";

/**
 * The Edge-style sidebar for /admin: a rail of icons on the right edge, the
 * panel it opens, and the sheet that replaces both on a phone. Mounted by
 * app/admin/layout.tsx, which also holds the CSS that makes room for it.
 *
 * The pages come through as `children`, inside the provider, so the full
 * pages of the same three tools (/admin/calendar, /admin/tasks,
 * /admin/quick-notes) share the stores with the panel: a task ticked on the
 * page is ticked in the rail's badge at once.
 */
export function AdminSidePanel({ children }: PropsWithChildren) {
  return (
    <SidePanelProvider>
      {children}
      <SideRail />
      <SidePanelFrame />
      <SideSheet />
    </SidePanelProvider>
  );
}
