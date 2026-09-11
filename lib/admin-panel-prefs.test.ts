import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShortcutKeys } from "@/lib/admin-panel-prefs";

// The module keeps this tab's choice in module state, so every test loads a
// fresh copy of it.
async function load() {
  vi.resetModules();
  return import("@/lib/admin-panel-prefs");
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  // resetAllMocks first: vitest cannot remove a spy from happy-dom's Storage
  // proxy, so restoreAllMocks alone would leave a throwing setItem in place
  // for the tests after it. Resetting puts the real implementation back.
  vi.resetAllMocks();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.adminPanel;
});

describe("readAdminPanel / writeAdminPanel", () => {
  it("is closed when the page was not marked", async () => {
    const { readAdminPanel } = await load();
    expect(readAdminPanel()).toBeNull();
  });

  it("starts from the panel the head script marked on <html>", async () => {
    const { ADMIN_PANEL_HEAD_SNIPPET, ADMIN_PANEL_KEY, readAdminPanel } = await load();
    localStorage.setItem(ADMIN_PANEL_KEY, "tasks");
    new Function(ADMIN_PANEL_HEAD_SNIPPET)();
    expect(readAdminPanel()).toBe("tasks");
  });

  it("ignores a mark it does not know", async () => {
    const { readAdminPanel } = await load();
    document.documentElement.dataset.adminPanel = "mail";
    expect(readAdminPanel()).toBeNull();
  });

  it("follows <html>, not storage, when another tab changed storage after the page loaded", async () => {
    // The first read can come long after page load, on a client-side
    // navigation into /admin; <html> is what the CSS is showing.
    const { ADMIN_PANEL_KEY, readAdminPanel } = await load();
    document.documentElement.dataset.adminPanel = "notes";
    localStorage.setItem(ADMIN_PANEL_KEY, "calendar");
    expect(readAdminPanel()).toBe("notes");
  });

  it("round-trips a panel and stores it for the next page load", async () => {
    const { ADMIN_PANEL_KEY, readAdminPanel, writeAdminPanel } = await load();
    writeAdminPanel("tasks");
    expect(readAdminPanel()).toBe("tasks");
    expect(localStorage.getItem(ADMIN_PANEL_KEY)).toBe("tasks");
  });

  it("removes the key when the panel closes", async () => {
    const { ADMIN_PANEL_KEY, writeAdminPanel } = await load();
    writeAdminPanel("tasks");
    writeAdminPanel(null);
    expect(localStorage.getItem(ADMIN_PANEL_KEY)).toBeNull();
  });

  it("keeps a panel the storage refused to save, and still says so", async () => {
    const { readAdminPanel, subscribeAdminPanel, writeAdminPanel } = await load();
    const listener = vi.fn();
    subscribeAdminPanel(listener);
    // On the instance, not Storage.prototype: happy-dom binds Storage methods
    // onto the instance the first time they are used, so a prototype spy is
    // never reached once an earlier test has touched localStorage.
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    writeAdminPanel("calendar");
    expect(setItem).toHaveBeenCalled();
    expect(readAdminPanel()).toBe("calendar");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not move when another tab changes the stored value", async () => {
    const { ADMIN_PANEL_KEY, readAdminPanel } = await load();
    expect(readAdminPanel()).toBeNull();
    localStorage.setItem(ADMIN_PANEL_KEY, "notes");
    expect(readAdminPanel()).toBeNull();
  });
});

describe("subscribeAdminPanel", () => {
  it("tells subscribers about each change until they unsubscribe", async () => {
    const { subscribeAdminPanel, writeAdminPanel } = await load();
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
  // Runs the snippet the way the head script does, then reads <html>.
  async function run(): Promise<string | undefined> {
    const { ADMIN_PANEL_HEAD_SNIPPET } = await load();
    new Function(ADMIN_PANEL_HEAD_SNIPPET)();
    return document.documentElement.dataset.adminPanel;
  }

  it("marks <html> with the stored panel", async () => {
    const { ADMIN_PANEL_KEY } = await load();
    localStorage.setItem(ADMIN_PANEL_KEY, "notes");
    expect(await run()).toBe("notes");
  });

  it("leaves <html> alone for anything else", async () => {
    const { ADMIN_PANEL_KEY } = await load();
    expect(await run()).toBeUndefined();
    localStorage.setItem(ADMIN_PANEL_KEY, "mail");
    expect(await run()).toBeUndefined();
  });

  it("swallows its own errors, so blocked storage cannot stop the page", async () => {
    const getItem = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    await expect(run()).resolves.toBeUndefined();
    expect(getItem).toHaveBeenCalled();
  });
});

describe("shortcutPanel / shortcutLabel", () => {
  const alt = (code: string, extra: Partial<ShortcutKeys> = {}): ShortcutKeys => ({
    altKey: true,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    code,
    ...extra,
  });

  it("maps Alt+1, Alt+2, Alt+3 to the panels in rail order", async () => {
    const { shortcutPanel } = await load();
    expect(["Digit1", "Digit2", "Digit3"].map((code) => shortcutPanel(alt(code)))).toEqual([
      "calendar",
      "tasks",
      "notes",
    ]);
  });

  it.each([
    ["no Alt", alt("Digit1", { altKey: false })],
    ["AltGr, which Windows reports as Ctrl+Alt", alt("Digit1", { ctrlKey: true })],
    ["Shift", alt("Digit1", { shiftKey: true })],
    ["Meta", alt("Digit1", { metaKey: true })],
    ["a held key repeating", alt("Digit1", { repeat: true })],
    ["the number pad", alt("Numpad1")],
    ["a digit with no panel", alt("Digit4")],
    ["Alt+0", alt("Digit0")],
  ])("ignores %s", async (_label, keys) => {
    const { shortcutPanel } = await load();
    expect(shortcutPanel(keys)).toBeNull();
  });

  it("labels each panel with its shortcut", async () => {
    const { shortcutLabel } = await load();
    expect(shortcutLabel("calendar")).toBe("Alt+1");
    expect(shortcutLabel("notes")).toBe("Alt+3");
  });
});
