import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTasksStore } from "@/components/admin/side-panel/use-tasks-store";
import type { AdminTask } from "@/lib/admin-tasks";

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
  init: RequestInit;
  resolve: (r: unknown) => void;
  reject: (e: unknown) => void;
};
let calls: Call[] = [];

const res = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});
const sent = (i: number) => JSON.parse(String(calls[i].init.body));
const settle = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
  });

const ID = "11111111-1111-4111-8111-111111111111";

const task = (overrides: Partial<AdminTask> = {}): AdminTask => ({
  id: ID,
  title: "Task gốc",
  due_on: null,
  done_at: null,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

/** Resolves the PUT at `calls[i]` the way the route would: the body sent back as the stored task. */
function resolvePut(i: number, updated_at = "2026-09-15T00:00:00.000Z") {
  calls[i].resolve(res(200, { task: { id: ID, ...sent(i), updated_at } }));
}

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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const f of [toastMock, toastMock.error, toastMock.success, toastMock.dismiss]) f.mockClear();
});

async function loaded(list: AdminTask[]) {
  const hook = renderHook(() => useTasksStore(true));
  await settle();
  expect(calls[0].url).toBe("/api/admin/tasks");
  calls[0].resolve(res(200, { tasks: list }));
  await settle();
  expect(hook.result.current.status).toBe("ready");
  return hook;
}

/** The onClick of the most recent toast.success call's action. */
function lastUndo() {
  const call = toastMock.success.mock.calls.at(-1);
  return (call![1] as { action: { onClick: () => void } }).action.onClick;
}

describe("useTasksStore", () => {
  it("(a) tick then Undo while the first PUT is held sends the done version, then the open one, in order", async () => {
    const { result } = await loaded([task()]);

    act(() => result.current.toggleDone(result.current.tasks[0]));
    await settle();
    expect(calls).toHaveLength(2);
    expect(sent(1).done_at).not.toBeNull();

    // Undo, while the tick's PUT is still unanswered.
    const undo = lastUndo();
    act(() => undo());
    await settle();
    expect(calls).toHaveLength(2); // queued behind the tick's PUT, not sent yet

    resolvePut(1); // the tick's PUT finally settles
    await settle();
    expect(calls).toHaveLength(3);
    expect(sent(2).done_at).toBeNull(); // the Undo's PUT, sent next

    resolvePut(2);
    await settle();
    expect(result.current.tasks[0].done_at).toBeNull();
  });

  it("(b) tick, then a title change, then Undo keeps the new title and clears only done_at", async () => {
    const { result } = await loaded([task({ title: "Gốc" })]);

    act(() => result.current.toggleDone(result.current.tasks[0]));
    await settle();
    expect(calls).toHaveLength(2);

    act(() => result.current.update(result.current.tasks[0], { title: "Tên mới" }));
    await settle();
    expect(calls).toHaveLength(2); // queued behind the tick's PUT

    const undo = lastUndo();
    act(() => undo());
    await settle();
    expect(result.current.tasks[0]).toMatchObject({ title: "Tên mới", done_at: null });
    expect(calls).toHaveLength(2); // the Undo's PUT is queued too

    resolvePut(1); // the tick's PUT
    await settle();
    expect(calls).toHaveLength(3);
    expect(sent(2)).toMatchObject({ title: "Tên mới" }); // the rename, sent while still done

    resolvePut(2); // the rename's PUT
    await settle();
    expect(calls).toHaveLength(4);
    expect(sent(3)).toMatchObject({ title: "Tên mới", done_at: null }); // the Undo's PUT

    resolvePut(3);
    await settle();
    expect(result.current.tasks[0]).toMatchObject({ title: "Tên mới", done_at: null });
  });

  it("(c) tick, then delete, then Undo on the tick toast sends no PUT for that task", async () => {
    const { result } = await loaded([task()]);

    act(() => result.current.toggleDone(result.current.tasks[0]));
    await settle();
    expect(calls).toHaveLength(2); // load + the tick's PUT, held

    act(() => result.current.remove(result.current.tasks[0]));
    await settle();
    expect(result.current.tasks).toHaveLength(0);
    expect(calls).toHaveLength(2); // the DELETE is queued behind the still-held PUT

    const undo = lastUndo(); // the tick toast's Undo, raised before the delete
    act(() => undo());
    await settle();
    expect(result.current.tasks).toHaveLength(0); // still gone: Undo found nothing to restore
    expect(calls).toHaveLength(2); // and sent no request at all

    resolvePut(1); // the tick's PUT finally settles
    await settle();
    expect(calls).toHaveLength(3);
    expect(calls[2].init.method).toBe("DELETE"); // only the delete follows, never another PUT

    calls[2].resolve(res(200, { ok: true })); // the delete settles
    await settle();
    expect(calls).toHaveLength(3); // and nothing else follows behind it
  });

  it("(d) a rename then a due-date change, both PUTs failing, ends back at the loaded version", async () => {
    const loadedTask = task({ title: "Gốc", due_on: null });
    const { result } = await loaded([loadedTask]);

    act(() => result.current.update(result.current.tasks[0], { title: "Đổi tên" }));
    await settle();
    expect(calls).toHaveLength(2);

    act(() => result.current.update(result.current.tasks[0], { due_on: "2026-09-20" }));
    await settle();
    expect(calls).toHaveLength(2); // queued behind the rename's PUT

    calls[1].reject(new TypeError("Failed to fetch")); // the rename fails, but a newer save is queued
    await settle();
    expect(result.current.tasks[0]).toMatchObject({ title: "Đổi tên", due_on: "2026-09-20" }); // no rollback yet
    expect(calls).toHaveLength(3); // the due-date change is sent next

    calls[2].reject(new TypeError("Failed to fetch")); // it fails too, and is now the latest
    await settle();
    expect(result.current.tasks[0]).toEqual(loadedTask); // back to what the server holds
  });

  it("(e) a failure while a newer save is queued causes no rollback, and the newer save still goes out", async () => {
    const { result } = await loaded([task({ title: "Gốc" })]);

    act(() => result.current.update(result.current.tasks[0], { title: "Đổi tên 1" }));
    await settle();
    expect(calls).toHaveLength(2);

    act(() => result.current.update(result.current.tasks[0], { title: "Đổi tên 2" }));
    await settle();
    expect(calls).toHaveLength(2); // the second update is queued behind the first

    calls[1].reject(new TypeError("Failed to fetch")); // the first (now stale) save fails
    await settle();
    expect(result.current.tasks[0].title).toBe("Đổi tên 2"); // no rollback: a newer save is on its way
    expect(calls).toHaveLength(3); // ...and it really is sent
    expect(sent(2)).toMatchObject({ title: "Đổi tên 2" });

    resolvePut(2);
    await settle();
    expect(result.current.tasks[0].title).toBe("Đổi tên 2");
  });
});
