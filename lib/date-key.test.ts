import { describe, expect, it } from "vitest";
import { addDaysToKey, fromDateKey, isDateKey, toDateKey } from "@/lib/date-key";

describe("date keys", () => {
  it("formats a date by the local calendar", () => {
    expect(toDateKey(new Date(2026, 8, 1, 23, 59))).toBe("2026-09-01");
  });

  it("reads a key back as local midnight", () => {
    const date = fromDateKey("2026-09-11");
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 8, 11, 0,
    ]);
  });

  it("adds days across a month end", () => {
    expect(addDaysToKey("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysToKey("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("accepts real days only", () => {
    expect(isDateKey("2026-09-11")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-9-11")).toBe(false);
    expect(isDateKey(20260911)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});
