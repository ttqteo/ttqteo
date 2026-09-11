import type { AdminPanelId } from "@/lib/admin-panel-prefs";
import {
  CalendarDaysIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";

export type PanelMeta = {
  id: AdminPanelId;
  label: string;
  shortcut: string;
  icon: LucideIcon;
};

/** Rail order, which is also the Alt+1/2/3 order. */
export const PANELS: readonly PanelMeta[] = [
  { id: "calendar", label: "Calendar", shortcut: "Alt+1", icon: CalendarDaysIcon },
  { id: "tasks", label: "Task", shortcut: "Alt+2", icon: SquareCheckBigIcon },
  { id: "notes", label: "Ghi nhanh", shortcut: "Alt+3", icon: StickyNoteIcon },
];

export function panelMeta(id: AdminPanelId): PanelMeta {
  return PANELS.find((panel) => panel.id === id) ?? PANELS[0];
}
