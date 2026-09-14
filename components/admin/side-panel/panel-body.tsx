"use client";

import type { AdminPanelId } from "@/lib/admin-panel-prefs";
import { NotesPanel } from "./notes-panel";
import { panelMeta } from "./panels";

/** `autoFocus`: put the cursor in the panel's input. Not when restored on page load. */
export function PanelBody({ id, autoFocus = false }: { id: AdminPanelId; autoFocus?: boolean }) {
  if (id === "notes") return <NotesPanel autoFocus={autoFocus} />;
  return <p className="p-4 text-sm text-muted-foreground">{panelMeta(id).label}: sắp có.</p>;
}
