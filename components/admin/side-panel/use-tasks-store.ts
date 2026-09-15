"use client";

import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";
import type { AdminTask } from "@/lib/admin-tasks";
import type { DateKey } from "@/lib/date-key";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { LoadStatus } from "./load-status";
import { clearAdminSession, reportAdminError } from "./report-admin-error";

export type TaskPatch = Partial<Pick<AdminTask, "title" | "due_on">>;

export type TasksStore = {
  status: LoadStatus;
  tasks: AdminTask[];
  reload: () => void;
  add: (title: string, dueOn: DateKey | null) => void;
  update: (task: AdminTask, patch: TaskPatch) => void;
  toggleDone: (task: AdminTask) => void;
  remove: (task: AdminTask) => void;
};

function putTask(task: AdminTask) {
  return adminFetch<{ task: AdminTask }>(`/api/admin/tasks/${task.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: task.title,
      due_on: task.due_on,
      done_at: task.done_at,
      created_at: task.created_at,
    }),
  });
}

const stamp = () => new Date().toISOString();

/**
 * The tasks behind the Task panel, the calendar agenda and the rail badge.
 * Every change shows at once and is saved in the background; a failed save
 * puts the task back as it was and says so, unless a newer change for that
 * task is already on its way. Each task's requests run one at a time and in
 * order, as the notes store's do: a rename then a delete cannot arrive out of
 * order, since the server stamps updated_at itself.
 */
export function useTasksStore(enabled: boolean): TasksStore {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [tasks, setTasks] = useState<AdminTask[]>([]);

  // The request each task has in flight, so a second change waits its turn.
  const queues = useRef(new Map<string, Promise<unknown>>());
  // The newest version handed to a request for each task, so a failure that
  // arrives after a newer change was sent knows not to roll anything back.
  const latest = useRef(new Map<string, AdminTask>());
  // The version the server holds for each task: filled from the load and from
  // every successful save, and cleared once a delete succeeds. A failed save
  // that is still the latest for its task restores this, never an unsaved
  // `before` that may itself never have reached the server.
  const confirmed = useRef(new Map<string, AdminTask>());
  // The list as of the latest render, so the tick toast's Undo can look up
  // what a task has become since it was ticked, rather than replaying a copy
  // from when the toast was raised.
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  /** Runs `request` once whatever this task already has in flight has settled. */
  const enqueue = useCallback(<T>(id: string, request: () => Promise<T>): Promise<T> => {
    const run = (queues.current.get(id) ?? Promise.resolve()).then(request);
    queues.current.set(id, run.catch(() => undefined));
    return run;
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await adminFetch<{ tasks: AdminTask[] }>("/api/admin/tasks");
      confirmed.current = new Map(data.tasks.map((task) => [task.id, task]));
      setTasks(data.tasks);
      setStatus("ready");
    } catch (error) {
      const missing = error instanceof AdminFetchError && error.kind === "missing_table";
      setStatus(missing ? "missing_table" : "error");
      if (!missing) reportAdminError(error, "Tải task");
    }
  }, []);

  // The first load, once enabled. Status stays "idle" until the answer is in,
  // so nothing sets state before the request goes out.
  const started = useRef(false);
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void fetchTasks();
  }, [enabled, fetchTasks]);

  /**
   * Puts back what the server holds for `id`, replacing the task shown or
   * adding it back if it is gone; drops it instead when nothing has ever
   * been confirmed there. Used once a failed request is found to still be
   * the latest for that id.
   */
  const rollback = useCallback((id: string) => {
    const back = confirmed.current.get(id);
    setTasks((list) => {
      if (!back) return list.filter((task) => task.id !== id);
      return list.some((task) => task.id === id)
        ? list.map((task) => (task.id === id ? back : task))
        : [...list, back];
    });
  }, []);

  /** Show `after` now and save it; if the save fails, roll back to what the server holds. */
  const replace = useCallback(
    (after: AdminTask) => {
      setTasks((list) => list.map((task) => (task.id === after.id ? after : task)));
      latest.current.set(after.id, after);
      enqueue(after.id, () => putTask(after)).then(
        ({ task: stored }) => {
          clearAdminSession();
          confirmed.current.set(after.id, stored);
          if (latest.current.get(after.id) === after) latest.current.delete(after.id);
        },
        (error) => {
          if (latest.current.get(after.id) === after) {
            latest.current.delete(after.id);
            rollback(after.id);
          }
          reportAdminError(error, "Lưu task");
        },
      );
    },
    [enqueue, rollback],
  );

  const insert = useCallback(
    (task: AdminTask) => {
      setTasks((list) => [...list.filter((t) => t.id !== task.id), task]);
      latest.current.set(task.id, task);
      enqueue(task.id, () => putTask(task)).then(
        ({ task: stored }) => {
          clearAdminSession();
          confirmed.current.set(task.id, stored);
          if (latest.current.get(task.id) === task) latest.current.delete(task.id);
        },
        (error) => {
          if (latest.current.get(task.id) === task) {
            latest.current.delete(task.id);
            rollback(task.id);
          }
          reportAdminError(error, "Lưu task");
        },
      );
    },
    [enqueue, rollback],
  );

  const add = useCallback(
    (title: string, dueOn: DateKey | null) => {
      const now = stamp();
      insert({
        id: crypto.randomUUID(),
        title: title.trim(),
        due_on: dueOn,
        done_at: null,
        created_at: now,
        updated_at: now,
      });
    },
    [insert],
  );

  const update = useCallback(
    (task: AdminTask, patch: TaskPatch) => replace({ ...task, ...patch, updated_at: stamp() }),
    [replace],
  );

  const toggleDone = useCallback(
    (task: AdminTask) => {
      const after: AdminTask = { ...task, done_at: task.done_at ? null : stamp(), updated_at: stamp() };
      replace(after);
      if (after.done_at) {
        toast.success("Xong một việc", {
          action: {
            label: "Undo",
            onClick: () => {
              // What the task has become since the toast was raised, not the
              // stale copy from before the tick: a title or date edited in
              // the meantime must stick, and a task deleted since must stay
              // deleted rather than be recreated by this PUT.
              const current = tasksRef.current.find((t) => t.id === after.id);
              if (!current || !current.done_at) return;
              replace({ ...current, done_at: null, updated_at: stamp() });
            },
          },
        });
      }
    },
    [replace],
  );

  const remove = useCallback(
    (task: AdminTask) => {
      setTasks((list) => list.filter((t) => t.id !== task.id));
      latest.current.delete(task.id);
      enqueue(task.id, () => adminFetch(`/api/admin/tasks/${task.id}`, { method: "DELETE" })).then(
        () => {
          clearAdminSession();
          confirmed.current.delete(task.id);
          toast.success("Đã xoá task", { action: { label: "Undo", onClick: () => insert(task) } });
        },
        (error) => {
          setTasks((list) => [...list, confirmed.current.get(task.id) ?? task]);
          reportAdminError(error, "Xoá task");
        },
      );
    },
    [enqueue, insert],
  );

  const reload = useCallback(() => {
    setStatus("loading");
    void fetchTasks();
  }, [fetchTasks]);

  return useMemo(
    () => ({ status, tasks, reload, add, update, toggleDone, remove }),
    [status, tasks, reload, add, update, toggleDone, remove],
  );
}
