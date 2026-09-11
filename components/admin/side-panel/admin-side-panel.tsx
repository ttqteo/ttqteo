"use client";

import { SidePanelFrame } from "./side-panel-frame";
import { SidePanelProvider } from "./side-panel-provider";
import { SideRail } from "./side-rail";
import { SideSheet } from "./side-sheet";

/**
 * The Edge-style sidebar for /admin: a rail of icons on the right edge, the
 * panel it opens, and the sheet that replaces both on a phone. Mounted by
 * app/admin/layout.tsx, which also holds the CSS that makes room for it.
 */
export function AdminSidePanel() {
  return (
    <SidePanelProvider>
      <SideRail />
      <SidePanelFrame />
      <SideSheet />
    </SidePanelProvider>
  );
}
