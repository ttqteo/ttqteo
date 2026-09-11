import { shortcutLabel, type AdminPanelId } from "@/lib/admin-panel-prefs";
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

/** Rail order. Keep it the order of ADMIN_PANEL_IDS, which the shortcuts follow. */
export const PANELS: readonly PanelMeta[] = [
  { id: "calendar", label: "Calendar", shortcut: shortcutLabel("calendar"), icon: CalendarDaysIcon },
  { id: "tasks", label: "Task", shortcut: shortcutLabel("tasks"), icon: SquareCheckBigIcon },
  { id: "notes", label: "Ghi nhanh", shortcut: shortcutLabel("notes"), icon: StickyNoteIcon },
];

export function panelMeta(id: AdminPanelId): PanelMeta {
  return PANELS.find((panel) => panel.id === id) ?? PANELS[0];
}
