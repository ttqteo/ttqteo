"use client";

import { useSidePanel } from "@/components/admin/side-panel/side-panel-provider";
import { TasksPanel } from "@/components/admin/side-panel/tasks-panel";
import { useNow } from "@/components/admin/side-panel/use-now";
import { badgeCount } from "@/lib/admin-tasks";
import { toDateKey } from "@/lib/date-key";

/**
 * /admin/tasks: the same list as the panel, in a column wide enough that a
 * title reads whole and the due and delete controls do not crowd it.
 */
export function TasksPage() {
  const { tasks } = useSidePanel();
  const today = toDateKey(useNow());
  const open = tasks.tasks.filter((task) => task.done_at === null).length;
  const due = badgeCount(tasks.tasks, today);

  return (
    // Same top padding as /admin, which also sits under the toolbar with no navbar.
    <div className="mx-auto max-w-2xl px-2 pb-8 pt-12 sm:px-4">
      <header className="flex items-baseline justify-between gap-3 px-3">
        <h1 className="font-serif text-2xl">Task</h1>
        {tasks.status === "ready" && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {open} việc{due > 0 && ` · ${due} tới hạn`}
          </span>
        )}
      </header>
      <TasksPanel autoFocus />
    </div>
  );
}
