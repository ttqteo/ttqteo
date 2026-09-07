import "@testing-library/jest-dom/vitest";

/**
 * Node 25 ships an experimental built-in `localStorage` global. Started
 * without a valid `--localstorage-file`, it is an empty plain object with no
 * Storage methods at all — and it shadows the working implementation
 * happy-dom installs, so `window.localStorage.clear()` fails with
 * "is not a function". happy-dom's own Storage is fine; it just never
 * reaches the global.
 *
 * Overwrite both storages with real happy-dom Storage instances. Drop this
 * once Node's built-in stops being installed unconditionally, or once
 * happy-dom starts winning the assignment.
 */
function installStorage(name: "localStorage" | "sessionStorage"): void {
  if (typeof Storage !== "function") return;
  const value = new Storage();
  for (const target of [globalThis, globalThis.window]) {
    if (!target) continue;
    Object.defineProperty(target, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
}

installStorage("localStorage");
installStorage("sessionStorage");
