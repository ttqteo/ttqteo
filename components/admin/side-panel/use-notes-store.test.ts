import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotesStore } from "@/components/admin/side-panel/use-notes-store";
import type { AdminNote } from "@/lib/admin-notes";

const toastMock = vi.hoisted(() => {
  const t = vi.fn() as ReturnType<typeof vi.fn> & Record<string, ReturnType<typeof vi.fn>>;
  t.error = vi.fn();
  t.success = vi.fn();
  t.dismiss = vi.fn();
  return t;
});
vi.mock("sonner", () => ({ toast: toastMock }));

type Call = {
  url: string;
  init: RequestInit & { keepalive?: boolean };
  resolve: (r: unknown) => void;
  reject: (e: unknown) => void;
};
let calls: Call[] = [];

const res = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});
const iso = (ms: number) => new Date(ms).toISOString();
const note = (id: string, body: string, updated_at: string): AdminNote => ({
  id,
  body,
  pinned: false,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at,
});
const sent = (i: number) => JSON.parse(String(calls[i].init.body));
const settle = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
  });

const T = Date.parse("2026-09-14T00:00:00.000Z");
const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, init: RequestInit = {}) =>
        new Promise((resolve, reject) => {
          calls.push({ url, init, resolve, reject });
        }),
    ),
  );
  vi.spyOn(Date, "now").mockReturnValue(T);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const f of [toastMock, toastMock.error, toastMock.success, toastMock.dismiss]) f.mockClear();
});

async function loaded(list: AdminNote[]) {
  const hook = renderHook(() => useNotesStore(true));
  await settle();
  expect(calls[0].url).toBe("/api/admin/notes");
  calls[0].resolve(res(200, { notes: list }));
  await settle();
  expect(hook.result.current.status).toBe("ready");
  return hook;
}

describe("useNotesStore", () => {
  it("A: an older save's reply must not override a newer queued save", async () => {
    const { result } = await loaded([note(ID, "a", iso(T - 60_000))]);

    vi.mocked(Date.now).mockReturnValue(T + 1000);
    act(() => result.current.edit(result.current.notes[0], "ab"));
    act(() => result.current.flush(ID));
    await settle();
    expect(calls).toHaveLength(2);
    expect(sent(1)).toMatchObject({ body: "ab", updated_at: iso(T + 1000) });

    vi.mocked(Date.now).mockReturnValue(T + 3000);
    act(() => result.current.edit(result.current.notes[0], "abc"));
    act(() => result.current.flush(ID)); // e.g. leaving the note, or the next autosave
    await settle();
    expect(calls).toHaveLength(2); // queued behind the first

    // Another tab saved "xyz" at T+2000: newer than "ab", older than "abc".
    calls[1].resolve(res(200, { note: note(ID, "xyz", iso(T + 2000)) }));
    await settle();
    expect(calls).toHaveLength(3);
    expect(sent(2)).toMatchObject({ body: "abc", updated_at: iso(T + 3000) });
    const shownWhileAbcInFlight = result.current.notes[0].body;
    const dotWhileAbcInFlight = result.current.saveState[ID];

    // "abc" is the newest, so it wins on the server.
    calls[2].resolve(res(200, { note: note(ID, "abc", iso(T + 3000)) }));
    await settle();
    const shownAfter = result.current.notes[0].body;

    expect(dotWhileAbcInFlight).toBe("saving"); // "abc" has not landed yet
    expect(shownWhileAbcInFlight).toBe("abc"); // the stale "xyz" reply changes nothing
    expect(shownAfter).toBe("abc"); // the newest save is what the server now holds

    // The next keystroke, made on the "abc" the screen shows, is what goes out.
    vi.mocked(Date.now).mockReturnValue(T + 4000);
    act(() => result.current.edit(result.current.notes[0], "abc!"));
    act(() => result.current.flush(ID));
    await settle();
    expect(sent(3)).toMatchObject({ body: "abc!", updated_at: iso(T + 4000) });
  });

  it("B: pagehide must resend a save that was flushed but is still queued", async () => {
    const { result } = await loaded([note(ID, "a", iso(T - 60_000))]);
    act(() => result.current.edit(result.current.notes[0], "ab"));
    act(() => result.current.flush(ID));
    await settle();
    vi.mocked(Date.now).mockReturnValue(T + 10);
    act(() => result.current.edit(result.current.notes[0], "abc"));
    act(() => result.current.flush(ID));
    await settle();
    expect(calls).toHaveLength(2);

    window.dispatchEvent(new Event("pagehide"));
    const keepalive = calls.filter((c) => c.init.keepalive);
    expect(keepalive).toHaveLength(1); // "abc" was sent but not yet answered, and must not be lost
    expect(JSON.parse(String(keepalive[0].init.body))).toMatchObject({ body: "abc" });

    // Control: a pending (not yet flushed) edit also goes out.
    vi.mocked(Date.now).mockReturnValue(T + 20);
    act(() => result.current.edit(result.current.notes[0], "abcd"));
    window.dispatchEvent(new Event("pagehide"));
    const keepaliveAfter = calls.filter((c) => c.init.keepalive);
    expect(keepaliveAfter).toHaveLength(2);
    expect(JSON.parse(String(keepaliveAfter[1].init.body))).toMatchObject({ body: "abcd" });
  });

  it("C: a failed delete must put unsaved text back in line to save, with an error dot", async () => {
    const { result } = await loaded([note(ID, "a", iso(T - 60_000))]);
    act(() => result.current.edit(result.current.notes[0], "ab"));
    act(() => result.current.flush(ID));
    await settle();
    calls[1].reject(new TypeError("Failed to fetch")); // offline
    await settle();
    expect(result.current.saveState[ID]).toBe("error");

    act(() => result.current.remove(result.current.notes[0]));
    await settle();
    expect(calls[2].init.method).toBe("DELETE");
    calls[2].reject(new TypeError("Failed to fetch"));
    await settle();
    expect(result.current.notes[0].body).toBe("ab");
    expect(result.current.saveState[ID]).toBe("error"); // still unsaved: back in line, dot stays red

    // The retry this dot promises actually goes out.
    act(() => result.current.flush(ID));
    await settle();
    expect(calls).toHaveLength(4);
    expect(calls[3].init.method).toBe("PUT");
    expect(sent(3)).toMatchObject({ body: "ab" });
  });

  it("D: a tie with a different body must show the server's version", async () => {
    const fast = T + 60_000; // a version from a device a minute fast
    const { result } = await loaded([note(ID, "base", iso(fast))]);
    act(() => result.current.edit(result.current.notes[0], "mine"));
    act(() => result.current.flush(ID));
    await settle();
    expect(sent(1).updated_at).toBe(iso(fast + 1));
    // Another device edited the same version, got the same stamp, and landed first.
    calls[1].resolve(res(200, { note: note(ID, "theirs", iso(fast + 1)) }));
    await settle();
    expect(result.current.notes[0].body).toBe("theirs");
    expect(result.current.saveState[ID]).toBe("saved");
  });
});
