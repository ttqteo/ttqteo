import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_PANEL_HEAD_SNIPPET,
  ADMIN_PANEL_KEY,
  readAdminPanel,
  subscribeAdminPanel,
  writeAdminPanel,
} from "@/lib/admin-panel-prefs";

beforeEach(() => {
  localStorage.clear();
});

describe("readAdminPanel / writeAdminPanel", () => {
  it("is closed when nothing is stored", () => {
    expect(readAdminPanel()).toBeNull();
  });

  it("round-trips a panel", () => {
    writeAdminPanel("tasks");
    expect(readAdminPanel()).toBe("tasks");
  });

  it("removes the key when the panel closes", () => {
    writeAdminPanel("tasks");
    writeAdminPanel(null);
    expect(localStorage.getItem(ADMIN_PANEL_KEY)).toBeNull();
  });

  it("ignores a value it does not know", () => {
    localStorage.setItem(ADMIN_PANEL_KEY, "mail");
    expect(readAdminPanel()).toBeNull();
  });
});

describe("subscribeAdminPanel", () => {
  it("tells subscribers about each change until they unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAdminPanel(listener);
    writeAdminPanel("calendar");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    writeAdminPanel(null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("ADMIN_PANEL_HEAD_SNIPPET", () => {
  // Runs the snippet the way the head script does, with `r` standing in for <html>.
  function run(): string | undefined {
    const r = { dataset: {} as Record<string, string> };
    new Function("r", ADMIN_PANEL_HEAD_SNIPPET)(r);
    return r.dataset.adminPanel;
  }

  it("marks <html> with the stored panel", () => {
    localStorage.setItem(ADMIN_PANEL_KEY, "notes");
    expect(run()).toBe("notes");
  });

  it("leaves <html> alone for anything else", () => {
    expect(run()).toBeUndefined();
    localStorage.setItem(ADMIN_PANEL_KEY, "mail");
    expect(run()).toBeUndefined();
  });
});
