import { describe, expect, it } from "vitest";
import { isMissingTableError, isUuid, parseTimestamp } from "@/lib/admin-db";

describe("isMissingTableError", () => {
  it("recognises both ways Supabase reports a missing table", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "…" })).toBe(true);
    expect(isMissingTableError({ code: "42P01", message: "…" })).toBe(true);
    expect(
      isMissingTableError({
        message: "Could not find the table 'public.admin_notes' in the schema cache",
      }),
    ).toBe(true);
  });

  it("leaves every other error alone", () => {
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError({ code: "42703", message: 'column "x" does not exist' })).toBe(false);
    expect(isMissingTableError({ code: "42501", message: "permission denied" })).toBe(false);
  });
});

describe("isUuid", () => {
  it("accepts a uuid and nothing else", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b")).toBe(true);
    expect(isUuid("3f2b8c1e")).toBe(false);
    expect(isUuid("../blogs")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});

describe("parseTimestamp", () => {
  it("normalises to ISO", () => {
    expect(parseTimestamp("2026-09-11T03:00:00.123456+00:00")).toBe("2026-09-11T03:00:00.123Z");
  });

  it("is null for anything it cannot read", () => {
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp("yesterday")).toBeNull();
    expect(parseTimestamp(1_757_000_000_000)).toBeNull();
  });
});
