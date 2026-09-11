import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  it("is closed when nothing is stored", async () => {
    const { readAdminPanel } = await load();
    expect(readAdminPanel()).toBeNull();
  });

  it("starts from what the last page load stored", async () => {
    const { ADMIN_PANEL_KEY, readAdminPanel } = await load();
    localStorage.setItem(ADMIN_PANEL_KEY, "tasks");
    expect(readAdminPanel()).toBe("tasks");
  });

  it("ignores a stored value it does not know", async () => {
    const { ADMIN_PANEL_KEY, readAdminPanel } = await load();
    localStorage.setItem(ADMIN_PANEL_KEY, "mail");
    expect(readAdminPanel()).toBeNull();
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

  it("keeps a panel the storage refused to save", async () => {
    const { readAdminPanel, writeAdminPanel } = await load();
    // On the instance, not Storage.prototype: happy-dom binds Storage methods
    // onto the instance the first time they are used, so a prototype spy is
    // never reached once an earlier test has touched localStorage.
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    writeAdminPanel("calendar");
    expect(setItem).toHaveBeenCalled();
    expect(readAdminPanel()).toBe("calendar");
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
