"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { openTaskDays, tasksDueOn, type AdminTask } from "@/lib/admin-tasks";
import {
  dayLabel,
  daysWithEvents,
  eventsOn,
  eventTimeLabel,
  monthKeyOf,
  monthRange,
  type CalendarEvent,
} from "@/lib/calendar-events";
import { addDaysToKey, fromDateKey, toDateKey, type DateKey } from "@/lib/date-key";
import { newGoogleEventUrl } from "@/lib/google-calendar-link";
import { cn } from "@/lib/utils";
import {
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  RotateCwIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSidePanel } from "./side-panel-provider";
import { useNow } from "./use-now";

// Seven 2.5rem columns fill the 360px panel; the default 2rem leaves a gap.
const GRID_STYLE = { "--cell-size": "2.5rem" } as CSSProperties;

export function CalendarPanel() {
  const { calendar, tasks } = useSidePanel();
  const { ensure, refresh } = calendar;
  const now = useNow();
  const today = toDateKey(now);
  const [selected, setSelected] = useState<DateKey>(today);
  const [month, setMonth] = useState(() => monthKeyOf(today));
  const [expanded, setExpanded] = useState<string | null>(null);
  const selectedMonth = monthKeyOf(selected);

  // The grid's month for its dots, the selected day's month for the agenda.
  // Usually one and the same; paging the grid away splits them.
  useEffect(() => {
    ensure(month);
    ensure(selectedMonth);
  }, [ensure, month, selectedMonth]);

  const gridEvents = calendar.months[month]?.payload?.events;
  const dots = useMemo(() => {
    const { from, to } = monthRange(month);
    const days = daysWithEvents(gridEvents ?? [], from, to);
    for (const due of openTaskDays(tasks.tasks)) days.add(due);
    return [...days].map(fromDateKey);
  }, [gridEvents, month, tasks.tasks]);

  const day = calendar.months[selectedMonth];
  const payload = day?.payload ?? null;
  const loading = day?.status === "loading";
  const events = eventsOn(payload?.events ?? [], selected);
  const allDay = events.filter((event) => event.allDay);
  const timed = events.filter((event) => !event.allDay);
  const dueTasks = tasksDueOn(tasks.tasks, selected);
  // Where today's now-line goes: before the first event still to start, or after them all (-1).
  const nowAt =
    selected === today ? timed.findIndex((event) => Date.parse(event.start) > now.getTime()) : null;

  const select = (next: DateKey) => {
    setSelected(next);
    setMonth(monthKeyOf(next));
    setExpanded(null);
  };
  const toggle = (id: string) => setExpanded((open) => (open === id ? null : id));

  return (
    <div className="pb-4">
      <Calendar
        mode="single"
        required
        selected={fromDateKey(selected)}
        onSelect={(date: Date) => select(toDateKey(date))}
        month={fromDateKey(`${month}-01`)}
        onMonthChange={(date) => setMonth(monthKeyOf(toDateKey(date)))}
        weekStartsOn={1}
        modifiers={{ hasItems: dots }}
        modifiersClassNames={{ hasItems: "admin-cal-has-items" }}
        className="mx-auto"
        style={GRID_STYLE}
      />

      <div className="flex items-center gap-1 border-t px-3 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => select(today)}
        >
          Hôm nay
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Ngày trước"
          onClick={() => select(addDaysToKey(selected, -1))}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Ngày sau"
          onClick={() => select(addDaysToKey(selected, 1))}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <h3 className="ml-1 truncate text-sm font-medium">{dayLabel(selected)}</h3>
        <div className="ml-auto flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Tải lại lịch"
            title="Tải lại lịch"
            disabled={loading}
            onClick={() => refresh(selectedMonth)}
          >
            <RotateCwIcon className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
          {/* Created in Google's own form, which keeps this side read-only. */}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a
              href={newGoogleEventUrl(selected)}
              target="_blank"
              rel="noreferrer"
              aria-label="Thêm sự kiện trong Google Calendar"
              title="Thêm sự kiện trong Google Calendar"
            >
              <CalendarPlusIcon className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-1 px-3 pt-2">
        {payload && !payload.configured && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Chưa nối lịch Google: {payload.error}. Xem ADMIN_CALENDAR_FEEDS trong .env.example.
          </p>
        )}
        {payload && payload.failed.length > 0 && (
          <p className="text-xs text-destructive">Không tải được: {payload.failed.join(", ")}</p>
        )}
        {day?.status === "error" && (
          <p className="text-xs text-destructive">
            Không tải được lịch.{" "}
            <button type="button" className="underline" onClick={() => refresh(selectedMonth)}>
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
    </div>
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
