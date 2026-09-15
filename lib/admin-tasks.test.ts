import { describe, expect, it } from "vitest";
import {
  badgeCount,
  dueLabel,
  groupTasks,
  MAX_TASK_TITLE,
  openTaskDays,
  parseTaskInput,
  quickDueDate,
  tasksDueOn,
  type AdminTask,
} from "@/lib/admin-tasks";

// Friday 11 September 2026, 10:00 on the admin's clock.
const NOW = new Date(2026, 8, 11, 10, 0);
const TODAY = "2026-09-11";

function task(overrides: Partial<AdminTask>): AdminTask {
  return {
    id: overrides.title ?? "t",
    title: "Task",
    due_on: null,
    done_at: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const titles = (tasks: AdminTask[]) => tasks.map((t) => t.title);

describe("groupTasks", () => {
  it("files open tasks by when they are due", () => {
    const groups = groupTasks(
      [
        task({ title: "late", due_on: "2026-09-10" }),
        task({ title: "today", due_on: TODAY }),
        task({ title: "soon", due_on: "2026-09-12" }),
        task({ title: "whenever" }),
      ],
      TODAY,
      NOW,
    );
    expect(titles(groups.overdue)).toEqual(["late"]);
    expect(titles(groups.today)).toEqual(["today"]);
    expect(titles(groups.upcoming)).toEqual(["soon"]);
    expect(titles(groups.someday)).toEqual(["whenever"]);
  });

  it("orders a group by due day, then by creation", () => {
    const groups = groupTasks(
      [
        task({ title: "b", due_on: "2026-09-20", created_at: "2026-09-02T00:00:00.000Z" }),
        task({ title: "c", due_on: "2026-09-25" }),
        task({ title: "a", due_on: "2026-09-20", created_at: "2026-09-01T00:00:00.000Z" }),
      ],
      TODAY,
      NOW,
    );
    expect(titles(groups.upcoming)).toEqual(["a", "b", "c"]);
  });

  it("keeps a finished task out of the open groups", () => {
    const groups = groupTasks(
      [task({ title: "done late", due_on: "2026-09-01", done_at: NOW.toISOString() })],
      TODAY,
      NOW,
    );
    expect(groups.overdue).toEqual([]);
    expect(titles(groups.done)).toEqual(["done late"]);
  });

  it("lists the last week's finished tasks, newest first", () => {
    const groups = groupTasks(
      [
        task({ title: "eight days ago", done_at: new Date(2026, 8, 3, 9).toISOString() }),
        task({ title: "yesterday", done_at: new Date(2026, 8, 10, 9).toISOString() }),
        task({ title: "just now", done_at: new Date(2026, 8, 11, 9).toISOString() }),
      ],
      TODAY,
      NOW,
    );
    expect(titles(groups.done)).toEqual(["just now", "yesterday"]);
  });
});

describe("badgeCount", () => {
  it("counts open tasks due today or earlier", () => {
    const tasks = [
      task({ due_on: "2026-09-10" }),
      task({ due_on: TODAY }),
      task({ due_on: TODAY, done_at: NOW.toISOString() }),
      task({ due_on: "2026-09-12" }),
      task({}),
    ];
    expect(badgeCount(tasks, TODAY)).toBe(2);
  });
});

describe("tasksDueOn / openTaskDays", () => {
  const tasks = [
    task({ title: "open", due_on: TODAY }),
    task({ title: "done", due_on: TODAY, done_at: NOW.toISOString() }),
    task({ title: "later", due_on: "2026-09-14" }),
    task({ title: "undated" }),
  ];

  it("gives the agenda every task due that day, done or not", () => {
    expect(titles(tasksDueOn(tasks, TODAY)).sort()).toEqual(["done", "open"]);
  });

  it("marks only days that still have open work", () => {
    expect([...openTaskDays(tasks)].sort()).toEqual(["2026-09-11", "2026-09-14"]);
    expect(openTaskDays([task({ due_on: TODAY, done_at: NOW.toISOString() })]).size).toBe(0);
  });
});

describe("quickDueDate", () => {
  it("offers today, tomorrow and next Monday", () => {
    expect(quickDueDate("today", TODAY)).toBe(TODAY);
    expect(quickDueDate("tomorrow", TODAY)).toBe("2026-09-12");
    expect(quickDueDate("nextWeek", TODAY)).toBe("2026-09-14");
  });

  it("means the Monday after, even on a Sunday or a Monday", () => {
    expect(quickDueDate("nextWeek", "2026-09-13")).toBe("2026-09-14");
    expect(quickDueDate("nextWeek", "2026-09-14")).toBe("2026-09-21");
  });
});

describe("dueLabel", () => {
  it("names the days next to today", () => {
    expect(dueLabel(TODAY, TODAY)).toBe("Hôm nay");
    expect(dueLabel("2026-09-12", TODAY)).toBe("Ngày mai");
    expect(dueLabel("2026-09-10", TODAY)).toBe("Hôm qua");
  });

  it("gives other days as day/month, with a year only when it differs", () => {
    expect(dueLabel("2026-09-20", TODAY)).toBe("20/9");
    expect(dueLabel("2027-01-05", TODAY)).toBe("5/1/2027");
  });
});

describe("parseTaskInput", () => {
  it("trims the title and keeps the rest", () => {
    expect(
      parseTaskInput({ title: "  Viết bài  ", due_on: TODAY, done_at: "2026-09-11T03:00:00Z" }),
    ).toEqual({
      ok: true,
      input: { title: "Viết bài", due_on: TODAY, done_at: "2026-09-11T03:00:00.000Z" },
    });
  });

  it("treats missing due_on and done_at as none", () => {
    expect(parseTaskInput({ title: "x" })).toEqual({
      ok: true,
      input: { title: "x", due_on: null, done_at: null },
    });
  });

  it("keeps a readable created_at, for Undo", () => {
    expect(parseTaskInput({ title: "x", created_at: "2026-09-01T00:00:00Z" })).toMatchObject({
      input: { created_at: "2026-09-01T00:00:00.000Z" },
    });
  });

  it.each([
    ["a blank title", { title: "   " }],
    ["a title that is too long", { title: "x".repeat(MAX_TASK_TITLE + 1) }],
    ["a due day that does not exist", { title: "x", due_on: "2026-02-30" }],
    ["a due day with a time", { title: "x", due_on: "2026-09-11T00:00:00Z" }],
    ["an unreadable done_at", { title: "x", done_at: "soon" }],
    ["nothing at all", undefined],
  ])("rejects %s", (_label, value) => {
    expect(parseTaskInput(value)).toMatchObject({ ok: false });
  });
});
