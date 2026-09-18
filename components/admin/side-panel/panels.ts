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
  /** The full page with the same content, wider. */
  href: string;
};

/** Rail order. Keep it the order of ADMIN_PANEL_IDS, which the shortcuts follow. */
export const PANELS: readonly PanelMeta[] = [
  {
    id: "calendar",
    label: "Calendar",
    shortcut: shortcutLabel("calendar"),
    icon: CalendarDaysIcon,
    href: "/admin/calendar",
  },
  {
    id: "tasks",
    label: "Task",
    shortcut: shortcutLabel("tasks"),
    icon: SquareCheckBigIcon,
    href: "/admin/tasks",
  },
  {
    id: "notes",
    label: "Ghi nhanh",
    shortcut: shortcutLabel("notes"),
    icon: StickyNoteIcon,
    // The notes page holds the quick notes and the private notes in posts together.
    href: "/admin/notes",
  },
];

export function panelMeta(id: AdminPanelId): PanelMeta {
  return PANELS.find((panel) => panel.id === id) ?? PANELS[0];
}
