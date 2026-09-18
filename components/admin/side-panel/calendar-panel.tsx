"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { openTaskDays } from "@/lib/admin-tasks";
import { dayLabel, daysWithEvents, monthKeyOf, monthRange } from "@/lib/calendar-events";
import { addDaysToKey, fromDateKey, toDateKey, type DateKey } from "@/lib/date-key";
import { newGoogleEventUrl } from "@/lib/google-calendar-link";
import { cn } from "@/lib/utils";
import { CalendarPlusIcon, ChevronLeftIcon, ChevronRightIcon, RotateCwIcon } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { DayAgenda } from "./day-agenda";
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
  const loading = day?.status === "loading";

  const select = (next: DateKey) => {
    setSelected(next);
    setMonth(monthKeyOf(next));
  };

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

      <DayAgenda
        key={selected}
        day={selected}
        today={today}
        now={now}
        month={day}
        onRetry={() => refresh(selectedMonth)}
      />
    </div>
  );
}
