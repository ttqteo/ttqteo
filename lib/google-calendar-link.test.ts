import { describe, expect, it } from "vitest";
import { newGoogleEventUrl } from "@/lib/google-calendar-link";

describe("newGoogleEventUrl", () => {
  it("opens Google's form on an all-day slot, end exclusive", () => {
    const url = new URL(newGoogleEventUrl("2026-09-30"));
    expect(`${url.origin}${url.pathname}`).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260930/20261001");
    expect(url.searchParams.has("text")).toBe(false);
  });

  it("fills in a title when there is one", () => {
    expect(new URL(newGoogleEventUrl("2026-09-11", "  Họp nhóm ")).searchParams.get("text")).toBe(
      "Họp nhóm",
    );
  });
});
