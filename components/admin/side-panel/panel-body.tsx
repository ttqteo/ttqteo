"use client";

import type { AdminPanelId } from "@/lib/admin-panel-prefs";
import { panelMeta } from "./panels";

/** `autoFocus`: put the cursor in the panel's input. Not when restored on page load. */
export function PanelBody({ id }: { id: AdminPanelId; autoFocus?: boolean }) {
  return <p className="p-4 text-sm text-muted-foreground">{panelMeta(id).label}: sắp có.</p>;
}
