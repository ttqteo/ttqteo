"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { tasksDueOn, type AdminTask } from "@/lib/admin-tasks";
import { eventsOn, eventTimeLabel, type CalendarEvent } from "@/lib/calendar-events";
import type { DateKey } from "@/lib/date-key";
import { cn } from "@/lib/utils";
import { MapPinIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { useSidePanel } from "./side-panel-provider";
import type { CalendarMonth } from "./use-calendar-store";

/**
 * One day's agenda: all-day events, then the tasks due, then timed events
 * with a red line at the current time on today. Shared by the Calendar panel
 * and /admin/calendar. Mount it with `key={day}` so an expanded event folds
 * back up when the day changes.
 */
export function DayAgenda({
  day,
  today,
  now,
  month,
  onRetry,
}: {
  day: DateKey;
  today: DateKey;
  now: Date;
  /** The store's entry for the day's month; undefined before its first load. */
  month: CalendarMonth | undefined;
  onRetry: () => void;
}) {
  const { tasks } = useSidePanel();
  const [expanded, setExpanded] = useState<string | null>(null);
  const payload = month?.payload ?? null;
  const loading = month?.status === "loading";
  const events = eventsOn(payload?.events ?? [], day);
  const allDay = events.filter((event) => event.allDay);
  const timed = events.filter((event) => !event.allDay);
  const dueTasks = tasksDueOn(tasks.tasks, day);
  // Where today's now-line goes: before the first event still to start, or after them all (-1).
  const nowAt =
    day === today ? timed.findIndex((event) => Date.parse(event.start) > now.getTime()) : null;
  const toggle = (id: string) => setExpanded((open) => (open === id ? null : id));

  return (
    <>
      {/* No Google feed configured (payload.configured false) says nothing
          here: the agenda is then the day's tasks, which is fine on its own. */}
      <div className="space-y-1 px-3 pt-2">
        {payload && payload.failed.length > 0 && (
          <p className="text-xs text-destructive">Không tải được: {payload.failed.join(", ")}</p>
        )}
        {month?.status === "error" && (
          <p className="text-xs text-destructive">
            Không tải được lịch.{" "}
            <button type="button" className="underline" onClick={onRetry}>
              Thử lại
            </button>
          </p>
        )}
        {!payload && loading && (
          <p className="py-4 text-center text-xs text-muted-foreground">Đang tải lịch…</p>
        )}
      </div>

      <ul className="space-y-0.5 px-1 pt-1">
        {allDay.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            open={expanded === event.id}
            onToggle={() => toggle(event.id)}
          />
        ))}
        {dueTasks.map((task) => (
          <AgendaTask key={task.id} task={task} />
        ))}
        {timed.map((event, index) => (
          <Fragment key={event.id}>
            {nowAt === index && <NowLine />}
            <EventRow event={event} open={expanded === event.id} onToggle={() => toggle(event.id)} />
          </Fragment>
        ))}
        {nowAt === -1 && timed.length > 0 && <NowLine />}
      </ul>

      {payload && events.length === 0 && dueTasks.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Không có gì trong ngày này.
        </p>
      )}
    </>
  );
}

function EventRow({
  event,
  open,
  onToggle,
}: {
  event: CalendarEvent;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <span
          className="w-1 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: event.color }}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-medium", !open && "truncate")}>{event.title}</span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {eventTimeLabel(event)} · {event.calendar}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPinIcon className="h-3 w-3 shrink-0" />
              <span className={cn(!open && "truncate")}>{event.location}</span>
            </span>
          )}
          {open && event.description && (
            <span className="mt-1 block whitespace-pre-line break-words text-xs">
              {event.description}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function AgendaTask({ task }: { task: AdminTask }) {
  const { tasks } = useSidePanel();
  const done = task.done_at !== null;

  return (
    <li className="flex items-center gap-2 px-2 py-1.5">
      <Checkbox
        checked={done}
        onCheckedChange={() => tasks.toggleDone(task)}
        aria-label={done ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          done && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        task
      </span>
    </li>
  );
}

function NowLine() {
  return (
    <li aria-hidden className="flex items-center gap-1 px-2 py-0.5">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      <span className="h-px flex-1 bg-red-500" />
    </li>
  );
}
