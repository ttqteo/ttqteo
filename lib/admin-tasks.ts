import { parseTimestamp } from "@/lib/admin-db";
import { addDaysToKey, fromDateKey, isDateKey, type DateKey } from "@/lib/date-key";

/** One row of admin_tasks. `due_on` is a day with no time; `done_at` null means open. */
export type AdminTask = {
  id: string;
  title: string;
  due_on: DateKey | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskGroups = {
  overdue: AdminTask[];
  today: AdminTask[];
  upcoming: AdminTask[];
  someday: AdminTask[];
  done: AdminTask[];
};

/** Finished tasks stay listed this long. Older ones remain in the table, unlisted. */
export const DONE_VISIBLE_DAYS = 7;

export const MAX_TASK_TITLE = 500;

const DAY_MS = 86_400_000;

export function doneCutoff(now: Date): Date {
  return new Date(now.getTime() - DONE_VISIBLE_DAYS * DAY_MS);
}

function byDueThenCreated(a: AdminTask, b: AdminTask): number {
  return (
    (a.due_on ?? "").localeCompare(b.due_on ?? "") ||
    Date.parse(a.created_at) - Date.parse(b.created_at)
  );
}

export function groupTasks(tasks: AdminTask[], today: DateKey, now: Date): TaskGroups {
  const groups: TaskGroups = { overdue: [], today: [], upcoming: [], someday: [], done: [] };
  const cutoff = doneCutoff(now).getTime();

  for (const task of tasks) {
    if (task.done_at) {
      if (Date.parse(task.done_at) >= cutoff) groups.done.push(task);
    } else if (!task.due_on) {
      groups.someday.push(task);
    } else if (task.due_on < today) {
      groups.overdue.push(task);
    } else if (task.due_on === today) {
      groups.today.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }

  groups.overdue.sort(byDueThenCreated);
  groups.today.sort(byDueThenCreated);
  groups.upcoming.sort(byDueThenCreated);
  groups.someday.sort(byDueThenCreated);
  groups.done.sort((a, b) => Date.parse(b.done_at ?? "") - Date.parse(a.done_at ?? ""));
  return groups;
}

/** The number on the rail: open tasks due today or already late. */
export function badgeCount(tasks: AdminTask[], today: DateKey): number {
  return tasks.filter((task) => !task.done_at && task.due_on !== null && task.due_on <= today)
    .length;
}

/** Tasks due that day, open or done, for the calendar agenda. */
export function tasksDueOn(tasks: AdminTask[], day: DateKey): AdminTask[] {
  return tasks.filter((task) => task.due_on === day).sort(byDueThenCreated);
}

/** Days with an open task, for the dots on the month grid. */
export function openTaskDays(tasks: AdminTask[]): Set<DateKey> {
  const days = new Set<DateKey>();
  for (const task of tasks) if (!task.done_at && task.due_on) days.add(task.due_on);
  return days;
}

export type QuickDue = "today" | "tomorrow" | "nextWeek";

/** "Tuần sau" means next Monday, as in Google Tasks. */
export function quickDueDate(kind: QuickDue, today: DateKey): DateKey {
  if (kind === "today") return today;
  if (kind === "tomorrow") return addDaysToKey(today, 1);
  const weekday = fromDateKey(today).getDay(); // 0 is Sunday
  return addDaysToKey(today, (8 - weekday) % 7 || 7);
}

/** "Hôm nay", "Ngày mai", "Hôm qua", otherwise "12/9", with the year if it is not this one. */
export function dueLabel(due: DateKey, today: DateKey): string {
  if (due === today) return "Hôm nay";
  if (due === addDaysToKey(today, 1)) return "Ngày mai";
  if (due === addDaysToKey(today, -1)) return "Hôm qua";
  const [year, month, day] = due.split("-").map(Number);
  return due.slice(0, 4) === today.slice(0, 4) ? `${day}/${month}` : `${day}/${month}/${year}`;
}

export type TaskInput = {
  title: string;
  due_on: DateKey | null;
  done_at: string | null;
  created_at?: string;
};

/** Checks a PUT body for /api/admin/tasks/[id]. */
export function parseTaskInput(
  value: unknown,
): { ok: true; input: TaskInput } | { ok: false; error: string } {
  const data = (value ?? {}) as Record<string, unknown>;

  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) return { ok: false, error: "Task cần có tiêu đề" };
  if (title.length > MAX_TASK_TITLE) {
    return { ok: false, error: `Tiêu đề dài quá ${MAX_TASK_TITLE} ký tự` };
  }

  const dueOn = data.due_on == null ? null : isDateKey(data.due_on) ? data.due_on : undefined;
  if (dueOn === undefined) return { ok: false, error: "due_on phải có dạng YYYY-MM-DD" };

  const doneAt = data.done_at == null ? null : parseTimestamp(data.done_at);
  if (data.done_at != null && !doneAt) return { ok: false, error: "done_at không đọc được" };

  const createdAt = parseTimestamp(data.created_at);
  return {
    ok: true,
    input: {
      title,
      due_on: dueOn,
      done_at: doneAt,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  };
}
