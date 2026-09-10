import { describe, expect, it } from "vitest";
import { isNewerBuild } from "./build-version";

describe("isNewerBuild", () => {
  it("is true only when the served build differs", () => {
    expect(isNewerBuild("b2", "b1")).toBe(true);
    expect(isNewerBuild("b1", "b1")).toBe(false);
  });

  it("treats a missing id on either side as no news", () => {
    // The id failing to reach one side is a configuration problem, and
    // prompting on it would nag on every check for the life of the tab.
    expect(isNewerBuild("unknown", "b1")).toBe(false);
    expect(isNewerBuild("b2", "unknown")).toBe(false);
  });

  it("ignores anything that is not a non-empty string", () => {
    expect(isNewerBuild(undefined, "b1")).toBe(false);
    expect(isNewerBuild(null, "b1")).toBe(false);
    expect(isNewerBuild("", "b1")).toBe(false);
    expect(isNewerBuild(42, "b1")).toBe(false);
  });
});
