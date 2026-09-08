import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EDITOR_PREFS,
  EDITOR_PREFS_KEY,
  readEditorPrefs,
  writeEditorPrefs,
} from "./editor-prefs";

beforeEach(() => {
  localStorage.clear();
});

describe("readEditorPrefs", () => {
  it("returns the defaults when nothing is stored", () => {
    expect(readEditorPrefs()).toEqual(DEFAULT_EDITOR_PREFS);
  });

  it("round-trips what was written", () => {
    writeEditorPrefs({ showToc: false, width: "wide", align: "left" });
    expect(readEditorPrefs()).toEqual({
      showToc: false,
      width: "wide",
      align: "left",
    });
  });

  it("fills in missing fields from the defaults", () => {
    localStorage.setItem(EDITOR_PREFS_KEY, JSON.stringify({ width: "wide" }));
    expect(readEditorPrefs()).toEqual({ ...DEFAULT_EDITOR_PREFS, width: "wide" });
  });

  it("falls back to the defaults for values outside the allowed set", () => {
    localStorage.setItem(
      EDITOR_PREFS_KEY,
      JSON.stringify({ width: "enormous", align: 7, showToc: "yes" }),
    );
    expect(readEditorPrefs()).toEqual(DEFAULT_EDITOR_PREFS);
  });

  it("survives unparseable storage", () => {
    localStorage.setItem(EDITOR_PREFS_KEY, "{not json");
    expect(readEditorPrefs()).toEqual(DEFAULT_EDITOR_PREFS);
  });
});
