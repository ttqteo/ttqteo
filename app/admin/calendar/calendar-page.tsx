"use client";

import { DayAgenda } from "@/components/admin/side-panel/day-agenda";
import { useSidePanel } from "@/components/admin/side-panel/side-panel-provider";
import { useNow } from "@/components/admin/side-panel/use-now";
import { Button } from "@/components/ui/button";
import { tasksDueOn, type AdminTask } from "@/lib/admin-tasks";
import {
  dayLabel,
  eventsOn,
  monthGridDays,
  monthKeyOf,
  monthLabel,
  shiftMonth,
  type CalendarEvent,
} from "@/lib/calendar-events";
import { toDateKey, type DateKey } from "@/lib/date-key";
import { newGoogleEventUrl } from "@/lib/google-calendar-link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCwIcon,
  SquareCheckIcon,
  SquareIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const WEEKDAY_HEADS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
/** Lines a day cell shows before folding the rest into "+n". */
const CELL_LINES = 3;

/**
 * /admin/calendar: the month as a grid with the events and due tasks written
 * into each day, and the selected day's agenda beside it. Same stores as the
 * panel, so both show the same months and the same ticks.
 */
export function CalendarPage() {
  const { calendar, tasks } = useSidePanel();
  const { ensure, refresh } = calendar;
  const now = useNow();
  const today = toDateKey(now);
  const [selected, setSelected] = useState<DateKey>(today);
  const [month, setMonth] = useState(() => monthKeyOf(today));
  const selectedMonth = monthKeyOf(selected);

  // The grid's month for its cells, the selected day's month for the agenda.
  // Usually one and the same; paging the grid away splits them.
  useEffect(() => {
    ensure(month);
    ensure(selectedMonth);
  }, [ensure, month, selectedMonth]);

  const days = useMemo(() => monthGridDays(month), [month]);
  const grid = calendar.months[month];
  const events = grid?.payload?.events ?? [];
  const loading = grid?.status === "loading";

  const select = (day: DateKey) => {
    setSelected(day);
    setMonth(monthKeyOf(day));
  };

  return (
    // Same top padding as /admin, which also sits under the toolbar with no navbar.
    <div className="mx-auto max-w-6xl px-2 pb-8 pt-12 sm:px-4">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="font-serif text-2xl">{monthLabel(month)}</h1>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Tháng trước"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Tháng sau"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => select(today)}
          >
            Hôm nay
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Tải lại lịch"
            title="Tải lại lịch"
            disabled={loading}
            onClick={() => refresh(month)}
          >
            <RotateCwIcon className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {/* Created in Google's own form, which keeps this side read-only. */}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a
              href={newGoogleEventUrl(selected)}
              target="_blank"
              rel="noreferrer"
              aria-label="Thêm sự kiện trong Google Calendar"
              title="Thêm sự kiện trong Google Calendar"
            >
              <CalendarPlusIcon className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6">
        <div role="grid" aria-label={monthLabel(month)} className="overflow-hidden rounded-lg border">
          <div
            role="row"
            className="grid grid-cols-7 border-b bg-muted/40 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {WEEKDAY_HEADS.map((head) => (
              <div key={head} role="columnheader" className="py-1.5">
                {head}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <DayCell
                key={day}
                day={day}
                inMonth={monthKeyOf(day) === month}
                isToday={day === today}
                isSelected={day === selected}
                events={eventsOn(events, day)}
                tasks={tasksDueOn(tasks.tasks, day)}
                onSelect={() => select(day)}
              />
            ))}
          </div>
        </div>

        <aside className="mt-6 rounded-lg border bg-card pb-3 lg:mt-0">
          <h2 className="border-b px-3 py-2 text-sm font-medium">{dayLabel(selected)}</h2>
          <DayAgenda
            key={selected}
            day={selected}
            today={today}
            now={now}
            month={calendar.months[selectedMonth]}
            onRetry={() => refresh(selectedMonth)}
          />
        </aside>
      </div>
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  isToday,
  isSelected,
  events,
  tasks,
  onSelect,
}: {
  day: DateKey;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  tasks: AdminTask[];
  onSelect: () => void;
}) {
  const [, month, date] = day.split("-").map(Number);
  // Same order as the agenda: all-day events, tasks due, then timed events.
  const line = (key: string, node: ReactNode) => ({ key, node });
  const lines = [
    ...events.filter((event) => event.allDay).map((event) => line(event.id, <EventLine event={event} />)),
    ...tasks.map((task) => line(task.id, <TaskLine task={task} />)),
    ...events.filter((event) => !event.allDay).map((event) => line(event.id, <EventLine event={event} />)),
  ];
  const shown = lines.slice(0, CELL_LINES);
  const more = lines.length - shown.length;

  return (
    <button
      type="button"
      role="gridcell"
      onClick={onSelect}
      aria-selected={isSelected}
      aria-label={dayLabel(day)}
      className={cn(
        "flex min-h-[6.5rem] flex-col items-stretch gap-0.5 border-b border-r p-1 text-left transition-colors hover:bg-muted/40",
        "[&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
        !inMonth && "bg-muted/20 text-muted-foreground/60",
        isSelected && "bg-muted/60",
      )}
    >
      <span
        className={cn(
          "mb-0.5 grid h-6 min-w-6 place-items-center self-start rounded-full px-1 text-xs tabular-nums",
          isToday && "bg-foreground font-medium text-background",
        )}
      >
        {/* The 1st names its month, as the grid borrows days from the neighbours. */}
        {date === 1 ? `${date}/${month}` : date}
      </span>
      {shown.map(({ key, node }) => (
        <span key={key} className="block min-w-0">
          {node}
        </span>
      ))}
      {more > 0 && (
        <span className="px-1 text-[11px] leading-4 text-muted-foreground">+{more}</span>
      )}
    </button>
  );
}

function EventLine({ event }: { event: CalendarEvent }) {
  return (
    <span className="flex items-center gap-1 text-[11px] leading-4" title={event.title}>
      <span className="h-3 w-1 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
      {!event.allDay && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {format(new Date(event.start), "HH:mm")}
        </span>
      )}
      <span className="truncate">{event.title}</span>
    </span>
  );
}

function TaskLine({ task }: { task: AdminTask }) {
  const done = task.done_at !== null;
  const Icon = done ? SquareCheckIcon : SquareIcon;
  return (
    <span
      className="flex items-center gap-1 text-[11px] leading-4 text-muted-foreground"
      title={task.title}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className={cn("truncate", done && "line-through")}>{task.title}</span>
    </span>
  );
}
