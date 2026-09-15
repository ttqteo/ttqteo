"use client";

import type { AdminPanelId } from "@/lib/admin-panel-prefs";
import { CalendarPanel } from "./calendar-panel";
import { NotesPanel } from "./notes-panel";
import { TasksPanel } from "./tasks-panel";

/** `autoFocus`: put the cursor in the panel's input. Not when restored on page load. */
export function PanelBody({ id, autoFocus = false }: { id: AdminPanelId; autoFocus?: boolean }) {
  if (id === "calendar") return <CalendarPanel />;
  if (id === "tasks") return <TasksPanel autoFocus={autoFocus} />;
  return <NotesPanel autoFocus={autoFocus} />;
}
