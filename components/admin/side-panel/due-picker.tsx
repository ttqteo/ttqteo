"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dueLabel, quickDueDate, type QuickDue } from "@/lib/admin-tasks";
import { fromDateKey, toDateKey, type DateKey } from "@/lib/date-key";
import { cn } from "@/lib/utils";
import { CalendarClockIcon } from "lucide-react";
import { useState } from "react";

const QUICK: { kind: QuickDue; label: string }[] = [
  { kind: "today", label: "Hôm nay" },
  { kind: "tomorrow", label: "Ngày mai" },
  { kind: "nextWeek", label: "Tuần sau" },
];

/**
 * Picks a task's due day: three quick choices, a month grid, and "Bỏ hạn".
 * `compact` is the icon-only trigger used on a task row.
 */
export function DuePicker({
  value,
  today,
  onChange,
  compact = false,
}: {
  value: DateKey | null;
  today: DateKey;
  onChange: (due: DateKey | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const pick = (due: DateKey | null) => {
    onChange(due);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Đổi hạn"
            title="Đổi hạn"
          >
            <CalendarClockIcon className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-9 shrink-0 gap-1.5 px-2 text-xs", !value && "text-muted-foreground")}
          >
            <CalendarClockIcon className="h-3.5 w-3.5" />
            {value ? dueLabel(value, today) : "Hạn"}
          </Button>
        )}
      </PopoverTrigger>
      {/* Above the side panel (z-56) it opens from. */}
      <PopoverContent align="end" className="z-[70] w-auto p-0">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {QUICK.map(({ kind, label }) => (
            <Button
              key={kind}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => pick(quickDueDate(kind, today))}
            >
              {label}
            </Button>
          ))}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => pick(null)}
            >
              Bỏ hạn
            </Button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={value ? fromDateKey(value) : undefined}
          onSelect={(date) => {
            if (date) pick(toDateKey(date));
          }}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}
