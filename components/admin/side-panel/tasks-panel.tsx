"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { dueLabel, groupTasks, MAX_TASK_TITLE, type AdminTask } from "@/lib/admin-tasks";
import { toDateKey, type DateKey } from "@/lib/date-key";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import { DuePicker } from "./due-picker";
import { PanelNotice } from "./panel-notice";
import { useSidePanel } from "./side-panel-provider";
import { useNow } from "./use-now";

export function TasksPanel({ autoFocus }: { autoFocus: boolean }) {
  const { tasks } = useSidePanel();
  const now = useNow();
  const today = toDateKey(now);
  const groups = useMemo(() => groupTasks(tasks.tasks, today, now), [tasks.tasks, today, now]);
  const [showDone, setShowDone] = useState(false);
  // The frame closes on Esc only while focus is inside it, so a tick or a
  // delete - which can remove the row focus was on - sends focus here rather
  // than letting it drop to <body>.
  const newTaskInput = useRef<HTMLInputElement>(null);
  const focusNewTask = () => newTaskInput.current?.focus({ preventScroll: true });

  if (tasks.status === "missing_table" || tasks.status === "error") {
    return <PanelNotice kind={tasks.status} onRetry={tasks.reload} />;
  }

  const openCount =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.someday.length;

  return (
    <div className="space-y-4 p-3">
      <NewTask
        today={today}
        autoFocus={autoFocus}
        disabled={tasks.status !== "ready"}
        inputRef={newTaskInput}
      />

      {(tasks.status === "idle" || tasks.status === "loading") && (
        <p className="py-6 text-center text-xs text-muted-foreground">Đang tải…</p>
      )}
      {tasks.status === "ready" && openCount === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Không còn việc nào.</p>
      )}

      <TaskGroup title="Quá hạn" danger tasks={groups.overdue} today={today} focusNewTask={focusNewTask} />
      <TaskGroup title="Hôm nay" tasks={groups.today} today={today} focusNewTask={focusNewTask} />
      <TaskGroup title="Sắp tới" tasks={groups.upcoming} today={today} focusNewTask={focusNewTask} />
      <TaskGroup title="Không hạn" tasks={groups.someday} today={today} focusNewTask={focusNewTask} />

      {groups.done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((shown) => !shown)}
            aria-expanded={showDone}
            className="flex items-center gap-1 px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRightIcon
              className={cn("h-3.5 w-3.5 transition-transform", showDone && "rotate-90")}
            />
            Đã xong ({groups.done.length})
          </button>
          {showDone && (
            <ul className="mt-1 space-y-0.5">
              {groups.done.map((task) => (
                <TaskRow key={task.id} task={task} today={today} focusNewTask={focusNewTask} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function NewTask({
  today,
  autoFocus,
  disabled,
  inputRef,
}: {
  today: DateKey;
  autoFocus: boolean;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement>;
}) {
  const { tasks } = useSidePanel();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<DateKey | null>(null);

  // Disabled until tasks have loaded, and a disabled input cannot take focus.
  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus();
  }, [autoFocus, disabled, inputRef]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    tasks.add(title, due);
    setTitle("");
    setDue(null);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Thêm task…"
        maxLength={MAX_TASK_TITLE}
        disabled={disabled}
        className="h-9"
      />
      <DuePicker value={due} today={today} onChange={setDue} />
    </form>
  );
}

function TaskGroup({
  title,
  danger = false,
  tasks,
  today,
  focusNewTask,
}: {
  title: string;
  danger?: boolean;
  tasks: AdminTask[];
  today: DateKey;
  focusNewTask: () => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h3
        className={cn(
          "mb-1 px-1 text-xs font-medium text-muted-foreground",
          danger && "text-destructive",
        )}
      >
        {title} <span className="tabular-nums">({tasks.length})</span>
      </h3>
      <ul className="space-y-0.5">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} focusNewTask={focusNewTask} />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({
  task,
  today,
  focusNewTask,
}: {
  task: AdminTask;
  today: DateKey;
  focusNewTask: () => void;
}) {
  const { tasks } = useSidePanel();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const done = task.done_at !== null;
  const overdue = !done && task.due_on !== null && task.due_on < today;
  // Enter and Esc unmount the input while it still has focus, which makes
  // Chrome fire a blur right after; this tells onBlur that key already ended
  // the edit, so it must not commit (or, for Enter, commit a second time).
  const skipBlur = useRef(false);
  const titleButton = useRef<HTMLButtonElement>(null);
  // Set whenever an edit just ended, so the effect below sends focus back to
  // the title button rather than letting it drop to <body>; not set on the
  // first render, when there is no rename to return focus from.
  const justEdited = useRef(false);

  useEffect(() => {
    if (editing || !justEdited.current) return;
    justEdited.current = false;
    titleButton.current?.focus({ preventScroll: true });
  }, [editing]);

  const commit = () => {
    justEdited.current = true;
    setEditing(false);
    const title = draft.trim();
    if (title && title !== task.title) tasks.update(task, { title });
    else setDraft(task.title);
  };

  return (
    <li className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50">
      <Checkbox
        checked={done}
        onCheckedChange={() => {
          tasks.toggleDone(task);
          focusNewTask();
        }}
        aria-label={done ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            maxLength={MAX_TASK_TITLE}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              commit();
            }}
            onKeyDown={(event) => {
              // A Telex composition's Enter or Esc ends the composition, not the edit.
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") {
                skipBlur.current = true;
                commit();
              }
              if (event.key === "Escape") {
                // Cancels the edit only; the panel stays open.
                event.stopPropagation();
                skipBlur.current = true;
                justEdited.current = true;
                setDraft(task.title);
                setEditing(false);
              }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <button
            type="button"
            ref={titleButton}
            data-task-title={task.id}
            onClick={() => {
              setDraft(task.title);
              setEditing(true);
            }}
            className={cn(
              "block w-full break-words text-left text-sm",
              done && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </button>
        )}
        {task.due_on && (
          <p className={cn("mt-0.5 text-xs text-muted-foreground", overdue && "text-destructive")}>
            {dueLabel(task.due_on, today)}
          </p>
        )}
      </div>
      {/* On hover from md up; always there on touch screens, which have no hover. */}
      <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <DuePicker
          compact
          value={task.due_on}
          today={today}
          onChange={(due_on) => tasks.update(task, { due_on })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Xoá task"
          onClick={() => {
            tasks.remove(task);
            focusNewTask();
          }}
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
