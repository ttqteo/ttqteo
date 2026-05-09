import { describe, it, expect } from "vitest";
import { currently } from "@/data/currently";

describe("currently config", () => {
  it("has between 1 and 5 lines", () => {
    expect(currently.lines.length).toBeGreaterThanOrEqual(1);
    expect(currently.lines.length).toBeLessThanOrEqual(5);
  });
  it("each line is a non-empty string", () => {
    for (const line of currently.lines) {
      expect(typeof line).toBe("string");
      expect(line.trim().length).toBeGreaterThan(0);
    }
  });
});
