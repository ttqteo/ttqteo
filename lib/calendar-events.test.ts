import { describe, expect, it } from "vitest";
import {
  dayLabel,
  daysWithEvents,
  eventsOn,
  eventTimeLabel,
  monthGridDays,
  monthKeyOf,
  monthLabel,
  monthRange,
  occursOn,
  shiftMonth,
  type CalendarEvent,
} from "@/lib/calendar-events";

// Instants are built from local dates so the tests read the same in any zone.
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 8, day, hour, minute).toISOString();

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: overrides.title ?? "e",
    calendar: "MIT",
    color: "#16a34a",
    title: "Sự kiện",
    location: null,
    description: null,
    allDay: false,
    start: at(11, 9),
    end: at(11, 10),
    ...overrides,
  };
}

describe("occursOn", () => {
  it("puts an event that crosses midnight on both days", () => {
    const match = event({ start: at(13, 22, 30), end: at(14, 0, 15) });
    expect(occursOn(match, "2026-09-12")).toBe(false);
    expect(occursOn(match, "2026-09-13")).toBe(true);
    expect(occursOn(match, "2026-09-14")).toBe(true);
    expect(occursOn(match, "2026-09-15")).toBe(false);
  });

  it("does not spill an event ending at midnight into the next day", () => {
    const evening = event({ start: at(13, 20), end: at(14, 0) });
    expect(occursOn(evening, "2026-09-14")).toBe(false);
  });

  it("shows a zero-length event exactly at local midnight on that day", () => {
    const midnight = event({ start: at(14, 0), end: at(14, 0) });
    expect(occursOn(midnight, "2026-09-14")).toBe(true);
    expect(occursOn(midnight, "2026-09-13")).toBe(false);
  });

  it("treats an all-day end as exclusive", () => {
    const trip = event({ allDay: true, start: "2026-09-14", end: "2026-09-16" });
    expect(["2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16"].map((d) => occursOn(trip, d)))
      .toEqual([false, true, true, false]);
  });
});

describe("eventsOn", () => {
  it("lists all-day events first, then timed ones by start", () => {
    const events = [
      event({ title: "Chiều", start: at(11, 14), end: at(11, 15) }),
      event({ title: "Sáng", start: at(11, 9), end: at(11, 10) }),
      event({ title: "Lễ", allDay: true, start: "2026-09-11", end: "2026-09-12" }),
      event({ title: "Hôm khác", start: at(12, 9), end: at(12, 10) }),
    ];
    expect(eventsOn(events, "2026-09-11").map((e) => e.title)).toEqual(["Lễ", "Sáng", "Chiều"]);
  });
});

describe("daysWithEvents", () => {
  it("marks every day an event touches, inside the range only", () => {
    const events = [event({ allDay: true, start: "2026-09-14", end: "2026-09-16" })];
    expect([...daysWithEvents(events, "2026-09-15", "2026-09-20")]).toEqual(["2026-09-15"]);
  });
});

describe("monthRange / monthKeyOf", () => {
  it("covers the month and a week either side", () => {
    expect(monthRange("2026-09")).toEqual({ from: "2026-08-25", to: "2026-10-08" });
  });

  it("crosses into the next year", () => {
    expect(monthRange("2026-12")).toEqual({ from: "2026-11-24", to: "2027-01-08" });
  });

  it("names a day's month", () => {
    expect(monthKeyOf("2026-09-11")).toBe("2026-09");
  });
});

describe("labels", () => {
  it("formats times and all-day", () => {
    expect(eventTimeLabel(event({ start: at(11, 9), end: at(11, 17, 30) }))).toBe("09:00–17:30");
    expect(eventTimeLabel(event({ allDay: true, start: "2026-09-11", end: "2026-09-12" }))).toBe(
      "Cả ngày",
    );
  });

  it("names the day in Vietnamese", () => {
    expect(dayLabel("2026-09-11")).toBe("Thứ 6, 11/9");
    expect(dayLabel("2026-09-13")).toBe("Chủ nhật, 13/9");
  });

  it("names the month in Vietnamese", () => {
    expect(monthLabel("2026-09")).toBe("Tháng 9, 2026");
  });
});

describe("monthGridDays", () => {
  it("runs from the Monday on or before the 1st to the Sunday on or after the last day", () => {
    const days = monthGridDays("2026-09");
    expect(days[0]).toBe("2026-08-31");
    expect(days[days.length - 1]).toBe("2026-10-04");
    expect(days).toHaveLength(35);
  });

  it("takes six weeks when the month needs them", () => {
    const days = monthGridDays("2026-03");
    expect(days[0]).toBe("2026-02-23");
    expect(days[days.length - 1]).toBe("2026-04-05");
    expect(days).toHaveLength(42);
  });
});

describe("shiftMonth", () => {
  it("steps across a year boundary either way", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
  });
});
