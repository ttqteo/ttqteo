# Admin Side Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Thêm vào `/admin` một sidebar bên phải kiểu Microsoft Edge: rail icon 48px, bấm vào mở panel 360px cho Calendar (lịch Google chỉ đọc cộng task có hạn), Task và Ghi nhanh.

**Architecture:** Toàn bộ UI nằm trong `components/admin/side-panel/`, mount ở `app/admin/layout.tsx`. Một provider giữ panel đang mở (localStorage, đọc bằng `useSyncExternalStore`) và ba kho dữ liệu. Note và task nằm ở hai bảng Supabase mới, đi qua các route `/api/admin/*` có `requireAdmin()` chặn trước và RLS chặn sau. Mỗi thay đổi là một `PUT` upsert với id do trình duyệt tạo. Lịch Google được server đọc từ link iCal bí mật, trải ra bằng `ical.js`, cache theo tháng bằng `unstable_cache`.

**Tech Stack:** Next.js 16 (App Router, route handlers), React 19, Supabase (RLS), Tailwind 3 + shadcn/Radix, date-fns 4, ical.js 2.x (mới), vitest + happy-dom.

**Thiết kế:** [2026-09-11-admin-side-panel-design.md](2026-09-11-admin-side-panel-design.md). Đọc file đó trước khi làm.

---

## Thay đổi khi làm, so với plan gốc

Code trên nhánh là bản đúng. Các khối code trong plan khớp với code tới Task 15, trừ lần sửa cuối của kho note. Từ Task 17 trở đi, code có thêm các thay đổi sau review mà các khối code trong plan không ghi lại. Những thay đổi chính:

- **Ghi nhanh lưu theo nguyên tắc bản sửa mới nhất thắng.**
  - Trình duyệt đóng dấu `updated_at` cho mỗi lần sửa, luôn sau bản trước (`nextStamp`).
  - Server chỉ ghi đè bản cũ hơn. Nó từ chối dấu nhanh hơn giờ server quá 5 phút (`code: "clock_ahead"`), và trả 404 `note_deleted` khi note bị xoá đúng lúc đang lưu. Nó bỏ ký tự NUL và thay nửa cặp surrogate.
  - Kho note có hàng chờ riêng cho từng note. Khi lưu hỏng, kho chỉ giữ bản mới nhất đã gửi.
  - Lúc đóng tab, kho gửi bằng `keepalive` cả những bản đã gửi mà chưa có trả lời, trong tổng 60 KB.
  - Kho tải lại danh sách khi quay lại tab hay mở lại panel, nếu không còn gì chờ lưu.
- **`adminFetch`** mang theo `code` của route, và coi một phản hồi thành công mà không đọc được là lỗi. Toast "Cần đăng nhập lại" chỉ có một, không tự tắt, và tự gỡ khi có request đi qua được (`clearAdminSession`).
- **Kho task** có hàng chờ riêng cho từng task. Khi lưu hỏng, task trở về bản server đang giữ (`confirmed`). Nút Undo trên toast tick dùng bản hiện tại của task.
- **Kho lịch** chỉ tải khi người dùng đã là admin.
  - Múi giờ không được định nghĩa trong file lịch thì quy đổi bằng `Intl`. Giờ không ghi múi giờ được hiểu là Asia/Ho_Chi_Minh.
  - Id sự kiện có kèm tên lịch.
  - Khoảng ngày hỏi được giới hạn trong 5 năm quanh hôm nay.
  - Log không bao giờ ghi link lịch.
- **Focus:**
  - Chỉ nhớ chỗ đang focus khi nó nằm ngoài sidebar.
  - Focus trong popover (portal) vẫn tính là trong panel.
  - Rời editor, tick, xoá hay sửa tên xong thì focus vẫn ở lại trong panel.
- **Test:** ngoài hàm thuần trong `lib/`, có thêm `lib/admin-api.test.ts` và hai test kho dữ liệu (`use-notes-store.test.ts`, `use-tasks-store.test.ts`) cho những chỗ dễ mất dữ liệu. Con số "gồm N test mới" ở Task 31 không còn đúng.
- **Biết trước, chưa làm:**
  - Xoá note là xoá thật, nên một tab cũ vẫn có thể tạo lại note vừa bị xoá ở tab khác.
  - Sự kiện dùng một tên múi giờ lạ mà file lịch không định nghĩa sẽ bị bỏ qua.
  - Tạo sự kiện bằng "+ Sự kiện" xong phải bấm ↻ thì mới thấy.
  - `discardIfBlank` bỏ qua lỗi khi xoá note trống.

## Trước khi bắt đầu

- Làm trên nhánh riêng: `git switch -c feat/admin-side-panel`, hoặc tạo worktree theo @superpowers:using-git-worktrees.
- `supabase/seed_java_core.sql` đang untracked và không thuộc việc này. Luôn `git add` từng file, không dùng `git add -A` hay `git add .`.
- Commit theo kiểu các commit gần đây (`feat: ...` viết thường, có body khi cần) và kết thúc bằng dòng `Co-Authored-By` như các commit trước.
- Lệnh kiểm dùng nhiều lần:
  - Một file test: `pnpm vitest run lib/<tên>.test.ts`
  - Toàn bộ test: `pnpm test`
  - Kiểu: `pnpm exec tsc --noEmit`
  - Lint: `pnpm lint`. Trên master cả repo có 0 error và 36 warning, phần lớn là các luật React Compiler mà `eslint.config.mjs` đã hạ xuống warning (3 cái trong số đó ở `app/admin/edit/[id]/edit-post-client.tsx`). Sau mỗi task vẫn phải là 0 error và 36 warning.
- Quy ước: comment trong code viết tiếng Anh, chữ trên giao diện tiếng Việt, không dùng em dash trong chữ trên giao diện. Import nội bộ dùng `@/lib/...`.
- Chỉ test code trong `lib/`: hàm thuần, và cổng admin với `getUser` giả. UI kiểm bằng tay ở cuối mỗi giai đoạn, như các plan trước.
- Trước khi bắt đầu, bản cuối của code trong plan này đã được chạy thử trên một bản sao của repo: `tsc` sạch, lint không thêm warning, test mới và toàn bộ test cũ đều qua, và một test render tạm (không nằm trong plan) đã bấm qua cả ba panel. Sau đó Task 1 được sửa qua ba vòng review (mỗi tab giữ panel riêng, bắt đầu từ dấu trên `<html>`) và đã chạy lại riêng trên nhánh. Các bản trung gian ở giai đoạn 1 đến 3 là tập con của bản cuối, chưa được chạy riêng: nếu `tsc` báo lỗi ở đó thì so với bản cuối.

**Ba chỗ khác với bản design lúc trình bày** (file design đã cập nhật theo):

1. API dùng `PUT /…/[id]` upsert thay cho `POST` + `PATCH`. Id do trình duyệt tạo, nên tạo mới, tự lưu, tick xong và Undo đều là một lệnh.
2. CSS chừa chỗ khoá theo `:has(.admin-side-rail)`, để khoảng chừa không ở lại trên trang công khai sau khi rời `/admin`.
3. Panel đang mở đọc bằng `useSyncExternalStore`, bắt đầu từ dấu trên `<html>` mà script `<head>` lấy từ localStorage. Không có effect nào gọi setState lúc nạp trang.

**Về z-index:** toolbar là `z-[60]`, header dính của editor là `z-[55]`. Panel dùng `z-[56]`: trên editor, dưới toolbar. Rail dùng `z-[57]`, cao hơn panel một bậc: tooltip của repo (`components/ui/tooltip.tsx`) không portal nên nằm trong stacking context của rail, và nếu rail ngang panel thì panel đang mở che mất tooltip. Popover thì có portal, nên popover mở từ panel phải là `z-[70]`, vì mặc định của shadcn là `z-50` và sẽ nằm dưới panel.

---

## Giai đoạn 1: Khung

Xong giai đoạn này: rail và panel rỗng chạy được, đẩy hay đè đúng theo độ rộng màn hình, có sheet trên điện thoại và phím tắt. Chưa có dữ liệu.

### Task 1: Nhớ panel đang mở

**Files:**
- Create: `lib/admin-panel-prefs.ts`
- Test: `lib/admin-panel-prefs.test.ts`

**Step 1: Viết test**

```ts
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
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/admin-panel-prefs.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/admin-panel-prefs"`.

**Step 3: Viết code**

```ts
/**
 * Which side panel is open in /admin (components/admin/side-panel). Stored as
 * a bare string, not JSON, because the head script in app/layout.tsx reads it
 * before first paint and has to stay tiny. Also a small external store, so
 * the provider can read it with useSyncExternalStore.
 *
 * Each tab keeps its own choice, as Edge's sidebar does. It starts from the
 * mark the head script put on <html> when the page loaded, so the panel and
 * the room made for it by that mark always agree, even when the provider
 * first reads it long after, on a client-side navigation into /admin. After
 * that only writeAdminPanel changes it, and always tells subscribers, which
 * is what useSyncExternalStore depends on. Storage is only for the next page
 * load, and only the head script reads it.
 */

export const ADMIN_PANEL_IDS = ["calendar", "tasks", "notes"] as const;

export type AdminPanelId = (typeof ADMIN_PANEL_IDS)[number];

export const ADMIN_PANEL_KEY = "ttqteo:admin-panel:v1";

/** Fired by the toolbar's phone-only button; the side panel provider listens. */
export const OPEN_ADMIN_SHEET_EVENT = "ttqteo:open-admin-sheet";

export function isAdminPanelId(value: unknown): value is AdminPanelId {
  return typeof value === "string" && (ADMIN_PANEL_IDS as readonly string[]).includes(value);
}

// This tab's choice. undefined until the first read seeds it from <html>.
let current: AdminPanelId | null | undefined;
const listeners = new Set<() => void>();

export function readAdminPanel(): AdminPanelId | null {
  if (typeof window === "undefined") return null;
  if (current === undefined) {
    const marked = document.documentElement.dataset.adminPanel;
    current = isAdminPanelId(marked) ? marked : null;
  }
  return current;
}

export function writeAdminPanel(panel: AdminPanelId | null): void {
  if (typeof window === "undefined") return;
  current = panel;
  try {
    if (panel) window.localStorage.setItem(ADMIN_PANEL_KEY, panel);
    else window.localStorage.removeItem(ADMIN_PANEL_KEY);
  } catch {
    /* blocked or full: this tab still has it in `current` */
  }
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore: `listener` runs after every writeAdminPanel. */
export function subscribeAdminPanel(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The keys a panel shortcut looks at: a KeyboardEvent, or a plain object in tests. */
export type ShortcutKeys = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "code" | "repeat"
>;

/**
 * Alt+1, Alt+2, Alt+3 open the panels in ADMIN_PANEL_IDS order. Matched by key
 * position (`code`), so every keyboard layout works; the number pad does not
 * count. Ctrl is refused, which also refuses AltGr, since Windows reports it
 * as Ctrl+Alt. A held key's repeats are ignored, or holding Alt+1 would flick
 * the panel open and shut.
 */
export function shortcutPanel(keys: ShortcutKeys): AdminPanelId | null {
  if (!keys.altKey || keys.ctrlKey || keys.metaKey || keys.shiftKey || keys.repeat) return null;
  const digit = /^Digit(\d)$/.exec(keys.code);
  if (!digit) return null;
  return ADMIN_PANEL_IDS[Number(digit[1]) - 1] ?? null;
}

/** The hint the rail shows for a panel: "Alt+1" for the first, and so on. */
export function shortcutLabel(id: AdminPanelId): string {
  return `Alt+${ADMIN_PANEL_IDS.indexOf(id) + 1}`;
}

/**
 * Appended to the head script in app/layout.tsx, after its try block, in a
 * try of its own: a failure earlier in that script cannot stop it, and a
 * blocked storage here cannot break the page. Marks <html> with the open
 * panel so the padding that makes room for it applies from the first frame,
 * not after hydration, and so readAdminPanel starts from the same value.
 * Outside /admin nothing reads the attribute.
 */
export const ADMIN_PANEL_HEAD_SNIPPET =
  `try{var ap=localStorage.getItem(${JSON.stringify(ADMIN_PANEL_KEY)});` +
  `if(${JSON.stringify(ADMIN_PANEL_IDS)}.indexOf(ap)>-1)` +
  `document.documentElement.dataset.adminPanel=ap;}catch(e){}`;
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/admin-panel-prefs.test.ts`
Expected: PASS, 22 tests.

**Step 5: Commit**

```bash
git add lib/admin-panel-prefs.ts lib/admin-panel-prefs.test.ts
git commit -m "feat: remember which admin side panel is open"
```

### Task 2: Đánh dấu `<html>` trước first paint

**Files:**
- Modify: `app/layout.tsx` (import, và chuỗi script trong `<head>` ở khoảng dòng 62)

**Step 1: Import đoạn script**

Thêm ngay trên dòng `import { KeyboardNav } from "@/lib/keyboard-nav";`:

```tsx
import { ADMIN_PANEL_HEAD_SNIPPET } from "@/lib/admin-panel-prefs";
```

**Step 2: Chèn vào script `<head>`**

Trong chuỗi `__html`, chèn `${ADMIN_PANEL_HEAD_SNIPPET}` ngay sau `}catch(e){}` và trước `})();`. Đoạn chèn vào có `try` riêng, nên dù phần đọc `reader-prefs` phía trước có lỗi thì panel vẫn được đánh dấu. Đuôi chuỗi thành:

```tsx
r.classList.add('is-admin');}catch(e){}${ADMIN_PANEL_HEAD_SNIPPET}})();`,
```

Không đụng phần đầu chuỗi, kể cả `\\s`.

**Step 3: Kiểm**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

Chạy `pnpm dev`, mở `http://localhost:3000/`, trong console gõ `localStorage.setItem("ttqteo:admin-panel:v1", "notes")`, F5, rồi `document.documentElement.dataset.adminPanel`.
Expected: `"notes"`. Xong thì `localStorage.removeItem("ttqteo:admin-panel:v1")`.

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: mark the open admin side panel before first paint"
```

### Task 3: Provider và danh sách panel

**Files:**
- Create: `components/admin/side-panel/panels.ts`
- Create: `components/admin/side-panel/side-panel-provider.tsx`

**Step 1: Danh sách panel**

```ts
import { shortcutLabel, type AdminPanelId } from "@/lib/admin-panel-prefs";
import {
  CalendarDaysIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";

export type PanelMeta = {
  id: AdminPanelId;
  label: string;
  shortcut: string;
  icon: LucideIcon;
};

/** Rail order. Keep it the order of ADMIN_PANEL_IDS, which the shortcuts follow. */
export const PANELS: readonly PanelMeta[] = [
  { id: "calendar", label: "Calendar", shortcut: shortcutLabel("calendar"), icon: CalendarDaysIcon },
  { id: "tasks", label: "Task", shortcut: shortcutLabel("tasks"), icon: SquareCheckBigIcon },
  { id: "notes", label: "Ghi nhanh", shortcut: shortcutLabel("notes"), icon: StickyNoteIcon },
];

export function panelMeta(id: AdminPanelId): PanelMeta {
  return PANELS.find((panel) => panel.id === id) ?? PANELS[0];
}
```

**Step 2: Provider, bản giai đoạn 1 (chưa có dữ liệu)**

Các giai đoạn sau thêm ba kho dữ liệu vào đây (Task 14, 20, 28).

```tsx
"use client";

import { useIsAdmin } from "@/components/contexts/admin-context";
import {
  OPEN_ADMIN_SHEET_EVENT,
  readAdminPanel,
  shortcutPanel,
  subscribeAdminPanel,
  writeAdminPanel,
  type AdminPanelId,
} from "@/lib/admin-panel-prefs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";

type SidePanelContextValue = {
  /** The open panel, on screens with room for the rail; null when closed. */
  panel: AdminPanelId | null;
  /** True when the panel was opened by a click or a shortcut, not restored on load. */
  openedByUser: boolean;
  toggle: (id: AdminPanelId) => void;
  close: () => void;
  /** The bottom sheet that stands in for rail and panel under 768px. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  sheetTab: AdminPanelId;
  setSheetTab: (id: AdminPanelId) => void;
};

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export function useSidePanel(): SidePanelContextValue {
  const value = useContext(SidePanelContext);
  if (!value) throw new Error("useSidePanel needs SidePanelProvider");
  return value;
}

// Tailwind's max-md, the exact complement of md (min-width: 768px). A plain
// (max-width: 767px) leaves a gap at fractional widths such as 767.2px, which
// a 125% display scale produces, where neither the rail nor the sheet works.
const PHONE_QUERY = "not all and (min-width: 768px)";
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
const closedOnServer = () => null;

export function SidePanelProvider({ children }: PropsWithChildren) {
  const admin = useIsAdmin();
  // Seeded from the mark the head script put on <html> before first paint,
  // so the panel and the room made for it always agree.
  const panel = useSyncExternalStore(subscribeAdminPanel, readAdminPanel, closedOnServer);
  const [openedByUser, setOpenedByUser] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<AdminPanelId>("tasks");
  // Where focus goes back to when the panel closes: whatever had it when the
  // panel opened (the editor, mid-sentence, after Alt+3), else the rail.
  const returnFocus = useRef<HTMLElement | null>(null);

  const apply = useCallback((next: AdminPanelId | null) => {
    const previous = readAdminPanel();
    const focused = document.activeElement;
    const active = focused instanceof HTMLElement && focused !== document.body ? focused : null;
    const focusInPanel = active?.closest(".admin-side-panel") != null;
    // Remember what had focus before the panel took it, the first time there
    // is something to remember: on opening, or on the first switch after a
    // panel was restored on load. A switch made from inside the panel keeps
    // what was remembered.
    if (next && !focusInPanel && !returnFocus.current) returnFocus.current = active;

    setOpenedByUser(next !== null);
    writeAdminPanel(next);
    const root = document.documentElement;
    if (next) root.dataset.adminPanel = next;
    else delete root.dataset.adminPanel;

    // preventScroll throughout: a plain focus() on the editor can scroll the
    // page to its start before ProseMirror puts the caret back.
    if (next) {
      // A switch unmounts the content under the cursor. The close button
      // stays mounted across switches, so focus waits there: Calendar has no
      // field of its own, and Task and Ghi nhanh move it on to theirs.
      if (focusInPanel && next !== previous) {
        document.querySelector<HTMLElement>("[data-panel-close]")?.focus({ preventScroll: true });
      }
      return;
    }
    // Closing hides the panel under the cursor; hand focus back rather than
    // let it fall to <body>.
    if (focusInPanel) {
      const rail = document.querySelector<HTMLElement>(`.admin-side-rail [data-panel="${previous}"]`);
      const back = returnFocus.current?.isConnected ? returnFocus.current : rail;
      back?.focus({ preventScroll: true });
      // An opener hidden or disabled since then cannot take focus: use the rail.
      if (document.activeElement !== back) rail?.focus({ preventScroll: true });
    }
    returnFocus.current = null;
  }, []);

  const toggle = useCallback(
    (id: AdminPanelId) => apply(readAdminPanel() === id ? null : id),
    [apply],
  );
  const close = useCallback(() => apply(null), [apply]);

  // Alt+1/2/3 (shortcutPanel). On a phone they open the sheet instead. In
  // focus mode, which hides rail and panel, they do nothing.
  useEffect(() => {
    if (!admin) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const id = shortcutPanel(event);
      if (!id || document.body.classList.contains("focus-mode")) return;
      event.preventDefault();
      if (isPhone()) {
        setSheetTab(id);
        setSheetOpen(true);
      } else {
        toggle(id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [admin, toggle]);

  // The toolbar is in the root layout, outside this provider, so its phone
  // button reaches the sheet through an event. Only where the sheet can show:
  // opened at 768px or wider it would leave its overlay up over nothing.
  useEffect(() => {
    const open = () => {
      if (isPhone()) setSheetOpen(true);
    };
    window.addEventListener(OPEN_ADMIN_SHEET_EVENT, open);
    return () => window.removeEventListener(OPEN_ADMIN_SHEET_EVENT, open);
  }, []);

  // The sheet is hidden from 768px up; widening the window with it open would
  // leave its overlay behind with nothing on it.
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => {
      if (!query.matches) setSheetOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(
    () => ({ panel, openedByUser, toggle, close, sheetOpen, setSheetOpen, sheetTab, setSheetTab }),
    [panel, openedByUser, toggle, close, sheetOpen, sheetTab],
  );

  return <SidePanelContext.Provider value={value}>{children}</SidePanelContext.Provider>;
}
```

**Step 3: Kiểm kiểu**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

**Step 4: Commit**

```bash
git add components/admin/side-panel/panels.ts components/admin/side-panel/side-panel-provider.tsx
git commit -m "feat: side panel provider with shortcuts and the phone sheet"
```

### Task 4: Rail, khung panel, sheet

**Files:**
- Create: `components/admin/side-panel/side-rail.tsx`
- Create: `components/admin/side-panel/side-panel-frame.tsx`
- Create: `components/admin/side-panel/side-sheet.tsx`
- Create: `components/admin/side-panel/panel-body.tsx`
- Create: `components/admin/side-panel/admin-side-panel.tsx`

**Step 1: Rail, chưa có badge (badge thêm ở Task 22)**

Class `display` không nằm ở đây mà ở CSS của `app/admin/layout.tsx` (Task 5), vì rail phải ẩn cho tới khi có `html.is-admin` và ẩn dưới 768px. Đừng thêm class `flex` vào `nav`.

```tsx
"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PANELS } from "./panels";
import { useSidePanel } from "./side-panel-provider";

export function SideRail() {
  const { panel, toggle } = useSidePanel();

  return (
    // display comes from app/admin/layout.tsx, not a class here: the rail is
    // hidden until html.is-admin and below 768px. z-57, one above the panel:
    // see the tooltip below.
    <nav
      aria-label="Lịch, task và ghi nhanh"
      className="admin-side-rail focus-mode-hidden fixed bottom-0 right-0 top-9 z-[57] w-12 flex-col items-center gap-1 border-l bg-background py-2"
    >
      {PANELS.map(({ id, label, shortcut, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-label={label}
              aria-pressed={panel === id}
              aria-keyshortcuts={shortcut}
              data-panel={id}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                panel === id && "bg-muted text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          {/* components/ui/tooltip.tsx does not portal, so this paints inside
              the rail's stacking context. That is why the rail sits one above
              the panel (z-57 over z-56): otherwise an open panel covers it. */}
          <TooltipContent side="left" className="z-[70]">
            {label} <span className="ml-1 font-mono text-[10px] text-muted-foreground">{shortcut}</span>
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}
```

**Step 2: Khung panel**

Esc chỉ đóng panel khi phím được bấm bên trong panel, chưa có lớp nào xử lý nó (Radix gọi `preventDefault` khi đóng popover hay tooltip), và bộ gõ không đang soạn chữ (Esc lúc gõ Telex là để huỷ chữ đang soạn). Popover mở từ panel được portal ra chỗ khác trong DOM, nhưng sự kiện React vẫn nổi lên tới đây.

```tsx
"use client";

import { XIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import { PanelBody } from "./panel-body";
import { panelMeta } from "./panels";
import { useSidePanel } from "./side-panel-provider";

export function SidePanelFrame() {
  const { panel, openedByUser, close } = useSidePanel();
  const meta = panel ? panelMeta(panel) : null;

  // Escape closes the panel only when nothing else wanted it:
  // - a layer that already handled it, such as a Radix popover or tooltip,
  //   has called preventDefault;
  // - an IME composition (Telex, say) uses Escape to cancel itself;
  // - a popover opened from the panel is portalled elsewhere in the DOM but
  //   still bubbles here through React, so the key must come from inside.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.currentTarget.contains(event.target as Node)) close();
  };

  return (
    // Shown by CSS off html[data-admin-panel] (app/admin/layout.tsx), so the
    // frame is there from first paint and its content follows hydration.
    <aside
      aria-label={meta?.label}
      onKeyDown={onKeyDown}
      className="admin-side-panel focus-mode-hidden fixed bottom-0 right-12 top-9 z-[56] w-[360px] flex-col border-l bg-background shadow-xl xl:shadow-none"
    >
      {meta && (
        <>
          <header className="flex h-11 shrink-0 items-center justify-between border-b px-3">
            <h2 className="text-sm font-medium">{meta.label}</h2>
            <button
              type="button"
              onClick={close}
              data-panel-close
              aria-label="Đóng panel"
              title="Đóng (Esc)"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PanelBody id={meta.id} autoFocus={openedByUser} />
          </div>
        </>
      )}
    </aside>
  );
}
```

**Step 3: Sheet cho điện thoại**

```tsx
"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PanelBody } from "./panel-body";
import { PANELS } from "./panels";
import { useSidePanel } from "./side-panel-provider";

/** Rail and panel in one, for screens under 768px where a 48px rail does not fit. */
export function SideSheet() {
  const { sheetOpen, setSheetOpen, sheetTab, setSheetTab } = useSidePanel();

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="flex h-[85dvh] flex-col gap-0 p-0 md:hidden"
      >
        <SheetTitle className="sr-only">Lịch, task và ghi nhanh</SheetTitle>
        {/* Toggle buttons like the rail's. mr-12 leaves the sheet's own close
            button its corner. */}
        <div className="mr-12 flex gap-1 border-b p-2">
          {PANELS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={sheetTab === id}
              onClick={() => setSheetTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm text-muted-foreground transition-colors",
                sheetTab === id && "bg-muted text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {/* No autofocus: on a phone it would pull the keyboard up over the
            sheet every time it opens, even just to look. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PanelBody id={sheetTab} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 4: Nội dung tạm của panel**

Giai đoạn 2, 3, 4 lần lượt thay bằng panel thật.

```tsx
"use client";

import type { AdminPanelId } from "@/lib/admin-panel-prefs";
import { panelMeta } from "./panels";

/** `autoFocus`: put the cursor in the panel's input. Not when restored on page load. */
export function PanelBody({ id }: { id: AdminPanelId; autoFocus?: boolean }) {
  return <p className="p-4 text-sm text-muted-foreground">{panelMeta(id).label}: sắp có.</p>;
}
```

**Step 5: Gộp lại**

```tsx
"use client";

import { SidePanelFrame } from "./side-panel-frame";
import { SidePanelProvider } from "./side-panel-provider";
import { SideRail } from "./side-rail";
import { SideSheet } from "./side-sheet";

/**
 * The Edge-style sidebar for /admin: a rail of icons on the right edge, the
 * panel it opens, and the sheet that replaces both on a phone. Mounted by
 * app/admin/layout.tsx, which also holds the CSS that makes room for it.
 */
export function AdminSidePanel() {
  return (
    <SidePanelProvider>
      <SideRail />
      <SidePanelFrame />
      <SideSheet />
    </SidePanelProvider>
  );
}
```

**Step 6: Kiểm kiểu**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

**Step 7: Commit**

```bash
git add components/admin/side-panel/side-rail.tsx components/admin/side-panel/side-panel-frame.tsx components/admin/side-panel/side-sheet.tsx components/admin/side-panel/panel-body.tsx components/admin/side-panel/admin-side-panel.tsx
git commit -m "feat: side panel rail, frame and phone sheet"
```

### Task 5: Mount vào `/admin` và chừa chỗ

**Files:**
- Modify: `app/admin/layout.tsx` (thay cả file)
- Modify: `components/admin-toolbar.tsx`
- Modify: `components/admin/logout-form.tsx`

**Step 1: Admin layout**

Thay toàn bộ `app/admin/layout.tsx` bằng:

```tsx
import { AdminSidePanel } from "@/components/admin/side-panel/admin-side-panel";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Everything under /admin has the admin toolbar for navigation, so the
          public navbar is redundant across the whole segment. A server-rendered
          style keeps it hidden from first paint instead of flashing in and then
          disappearing on hydration. React does not remove a hoisted style when
          you navigate out of /admin, so every rule here is keyed on the side
          panel's rail, which is only in the DOM under /admin. */}
      <style href="admin-shell" precedence="high">
        {`
          html.is-admin:has(.admin-side-rail) .site-navbar { display: none; }

          /* The shared <main> is w-[90vw] on phones, which reads well for an
             article but costs the posts table ~19px a side before its own
             padding starts. Admin is a working screen, not a reading one, so
             it takes the full width and sets its own gutters. Unchanged from
             sm up, where sm:container takes over anyway. */
          @media (max-width: 639px) {
            .app-shell:has(.admin-side-rail) > main { width: 100%; }
          }

          /* Room for the side panel (components/admin/side-panel): a 48px
             rail on the right edge and the 360px panel it opens.
             --admin-side-w is how much of that edge they take, so the shell's
             padding and the editor's fixed pieces all move by one number.
             The panel pushes the page only from 1280px; narrower, it floats
             over it, since 408px out of a laptop screen leaves the post table
             too tight. Under 768px neither shows and a phone gets a sheet.

             Keyed on :has() the rail, like the rules above: the style stays
             after you leave /admin, the rail does not. data-admin-panel is
             set before first paint by the head script in app/layout.tsx. */
          .admin-side-rail,
          .admin-side-panel { display: none; }
          @media (min-width: 768px) {
            html.is-admin:has(.admin-side-rail) { --admin-side-w: 48px; }
            html.is-admin:has(.admin-side-rail) .app-shell {
              padding-right: var(--admin-side-w, 0px);
            }
            html.is-admin .admin-side-rail { display: flex; }
            html.is-admin[data-admin-panel] .admin-side-panel { display: flex; }
          }
          @media (min-width: 1280px) {
            html.is-admin[data-admin-panel]:has(.admin-side-panel) { --admin-side-w: 408px; }
          }
          /* Focus mode hides rail and panel (focus-mode-hidden); hand their room back too. */
          body.focus-mode { --admin-side-w: 0px; }

          /* A dialog, alert dialog or sheet (all z-50) must not open under the
             rail (z-57) or the panel (z-56). Radix marks <body> with
             data-scroll-locked while one of them is open. */
          body[data-scroll-locked] :is(.admin-side-rail, .admin-side-panel) { z-index: 49; }
        `}
      </style>
      {children}
      <AdminSidePanel />
    </>
  );
}
```

**Step 2: Nút mở sheet trên toolbar (chỉ hiện trên điện thoại)**

Trong `components/admin-toolbar.tsx`, thay khối import đầu file bằng:

```tsx
import {
  FileTextIcon,
  MoonIcon,
  PanelRightIcon,
  PencilIcon,
  StickyNoteIcon,
  SunIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { AdminNavLink } from "@/components/admin-nav-link";
import { LogoutForm } from "@/components/admin/logout-form";
import { OPEN_ADMIN_SHEET_EVENT } from "@/lib/admin-panel-prefs";
```

Dòng đầu tiên trong thân `AdminToolbar`, trước comment `// Rendered unconditionally…`:

```tsx
  const pathname = usePathname();
```

Trong `<div className="flex shrink-0 items-center gap-3 sm:gap-4">`, chèn trước `<Link href="/admin/edit/new"`:

```tsx
          {/* The side panel's way in on a phone, where its rail does not fit.
              Only under /admin, the one place the panel is mounted; the
              toolbar sits outside it, hence the event. */}
          {pathname.startsWith("/admin") && (
            <button
              type="button"
              aria-label="Lịch, task và ghi nhanh"
              title="Lịch, task và ghi nhanh"
              onClick={() => window.dispatchEvent(new Event(OPEN_ADMIN_SHEET_EVENT))}
              className="grid h-5 w-5 place-items-center text-zinc-300 transition-colors hover:text-white md:hidden"
            >
              <PanelRightIcon className="h-3.5 w-3.5" />
            </button>
          )}
```

Trên điện thoại, chữ của `posts`, `notes` và `logout` chỉ còn cho trình đọc màn hình, vì thêm nút này thì toolbar tràn ở 390px. Đổi `<span>posts</span>` thành `<span className="sr-only sm:not-sr-only">posts</span>` và sửa comment ngay trên link đó như trong code; đổi `<span className="hidden sm:inline">notes</span>` thành `<span className="sr-only sm:not-sr-only">notes</span>`; và trong `components/admin/logout-form.tsx` đổi `<span>logout</span>` thành `<span className="sr-only sm:not-sr-only">logout</span>`.

```tsx
          {/* /admin is the post list now, so dashboard and posts are one item.
              On a phone the labels here are for screen readers only: next to
              the side panel's button, the bar no longer fits them at 390px. */}
          <AdminNavLink href="/admin" exact>
            <FileTextIcon className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only">posts</span>
          </AdminNavLink>
```

**Step 3: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 4: Commit**

```bash
git add app/admin/layout.tsx components/admin-toolbar.tsx components/admin/logout-form.tsx
git commit -m "feat: mount the side panel in /admin and make room for it"
```

### Task 6: Các phần tử fixed chừa chỗ cho rail

**Files:**
- Modify: `app/admin/edit/[id]/edit-post-client.tsx` (khoảng dòng 740 và 1002-1007)
- Modify: `app/layout.tsx` (Toaster, khoảng dòng 95)

**Step 1: Khung split của editor**

Tìm:

```tsx
        isSplit
          ? "fixed inset-0 z-40 bg-background flex flex-col pt-[36px]"
          : "min-h-[80vh]"
```

Thay bằng:

```tsx
        isSplit
          ? // Stops at the admin side rail, --admin-side-w (app/admin/layout.tsx).
            "fixed inset-y-0 left-0 right-[var(--admin-side-w,0px)] z-40 bg-background flex flex-col pt-[36px]"
          : "min-h-[80vh]"
```

**Step 2: Cụm nút góc dưới phải**

Tìm:

```tsx
      <div
        className={cn(
          "fixed bottom-4 z-[51] flex flex-col gap-2 transition-[right] duration-300 ease-out motion-reduce:transition-none",
          isSplit && panelOpen ? "right-[calc(45%+1rem)]" : "right-4",
        )}
      >
```

Thay bằng:

```tsx
      <div
        className="fixed bottom-4 z-[51] flex flex-col gap-2 transition-[right] duration-300 ease-out motion-reduce:transition-none"
        style={{
          // Clear of the admin side rail, --admin-side-w (app/admin/layout.tsx).
          // With the board open, past the board too: 45% of what the rail leaves.
          right:
            isSplit && panelOpen
              ? "calc(var(--admin-side-w, 0px) + (100% - var(--admin-side-w, 0px)) * 0.45 + 1rem)"
              : "calc(var(--admin-side-w, 0px) + 1rem)",
        }}
      >
```

`cn` vẫn được dùng ở chỗ khác trong file, giữ import.

**Step 3: Toaster**

Trong `app/layout.tsx`, thay `<Toaster richColors closeButton position="bottom-right" />` bằng:

```tsx
                {/* Clear of the admin side rail and panel, which set
                    --admin-side-w (app/admin/layout.tsx); 0 everywhere else. */}
                <Toaster
                  richColors
                  closeButton
                  position="bottom-right"
                  offset={{ right: "calc(var(--admin-side-w, 0px) + 24px)" }}
                />
```

Sonner dùng chuỗi offset nguyên văn cho `--offset-right`, và mặc định 24px cho các cạnh không khai báo.

**Step 4: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 5: Commit**

```bash
git add "app/admin/edit/[id]/edit-post-client.tsx" app/layout.tsx
git commit -m "fix: keep the editor's fixed pieces and toasts clear of the side rail"
```

### Task 7: Kiểm bằng tay giai đoạn 1

`pnpm dev`, đăng nhập, mở `/admin`. Mỗi dòng dưới đây phải đúng:

1. Màn từ 1280px: rail ở cạnh phải, dưới toolbar. Bấm icon Calendar: panel mở và bảng bài bị đẩy sang trái. Bấm lại: panel đóng.
2. F5 khi panel đang mở: khung panel có ngay từ lúc trang hiện, bảng không bị giật.
3. Khoảng 1024px: panel nổi đè lên bảng, có bóng; bảng giữ nguyên độ rộng.
4. 390px (DevTools, chế độ thiết bị): không có rail. Toolbar có icon panel; bấm vào mở sheet từ dưới lên, có ba tab; đóng được. Mở rộng cửa sổ khi sheet đang mở: sheet tự đóng, không còn lớp phủ.
5. Alt+1, Alt+2, Alt+3 mở đúng panel; bấm lại thì đóng. Tab tới nút đóng của panel rồi Esc: panel đóng, con trỏ về nút tương ứng trên rail.
6. Mở panel bằng chuột, Tab tới nút đóng, Enter: con trỏ về nút tương ứng trên rail, không rơi xuống trang. Phần quay về editor kiểm ở giai đoạn 2 (Task 16), khi panel đã có ô để gõ.
7. Khi panel đang mở, rê chuột vào một icon trên rail: tooltip hiện đè lên panel.
8. Windows scale 125% (hoặc DevTools với viewport 767px): lúc nào cũng có rail hoặc nút mở sheet trên toolbar, không bao giờ mất cả hai.
9. `/admin/edit/<id>`, chế độ split: khung split và bảng vẽ dừng trước rail; cụm nút góc dưới phải không nằm dưới rail. Bật focus mode: rail và panel ẩn, không còn khoảng trống bên phải.
10. Rời `/admin` bằng điều hướng client (ở `/admin`, gõ `g` rồi `h`): trang chủ không còn khoảng trống bên phải. Navbar hiện lại.
11. Toast (ví dụ publish một bài) hiện bên trái rail, không đè lên rail.
12. 360px, 375px và 390px ở `/admin` và `/admin/notes`: toolbar không tràn; trên điện thoại posts, notes và logout chỉ còn icon.
13. Khi panel đang mở, ở khoảng 1024px và 1300px: mở hộp xác nhận xoá một bài (và, dưới 1024px, sheet lọc bài): không phần nào nằm dưới rail hay panel, và lớp tối phủ cả rail lẫn panel.

---

## Giai đoạn 2: Ghi nhanh

### Task 8: Bảng dữ liệu

**Files:**
- Create: `supabase/add_admin_side_panel.sql`

Tạo cả hai bảng một lần để chỉ phải chạy SQL một lần.

**Step 1: Viết file**

```sql
-- Hai bang cho sidebar ben phai cua admin: ghi nhanh (admin_notes) va task
-- (admin_tasks). Xem docs/plans/2026-09-11-admin-side-panel-design.md.
--
-- Chi admin doc va ghi duoc, cung dieu kien voi blogs trong
-- restrict_blogs_to_admin.sql. Tai khoan cua ban phai co app_metadata.admin
-- truoc: chay cau update o dau file do mot lan, roi dang xuat va dang nhap lai.
-- Chua ai co thi file nay dung lai o buoc kiem ben duoi.
--
-- id do trinh duyet tao (crypto.randomUUID) de tu luu va Undo cung la mot
-- lenh upsert; default o day chi de insert tay trong SQL editor van chay.
--
-- Chay lai bao nhieu lan cung duoc.

begin;

-- Tao bang xong ma khong ai doc duoc thi panel chi hien danh sach rong, rat
-- kho doan ra vi sao. Nen dung lai ngay tu day.
do $$
begin
  if not exists (
    select 1 from auth.users where raw_app_meta_data ->> 'admin' = 'true'
  ) then
    raise exception 'Chua user nao co app_metadata.admin = true. Chay cau update o dau restrict_blogs_to_admin.sql truoc.';
  end if;
end $$;

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_on date,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_notes enable row level security;
alter table public.admin_tasks enable row level security;

drop policy if exists "Admin full access" on public.admin_notes;
create policy "Admin full access"
on public.admin_notes
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true')
with check ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true');

drop policy if exists "Admin full access" on public.admin_tasks;
create policy "Admin full access"
on public.admin_tasks
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true')
with check ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true');

-- Chi authenticated dung duoc hai bang, va chi bon lenh ma API can; RLS o tren
-- quyet dinh ai trong so do. anon khong co gi, ke ca xem cot trong OpenAPI.
revoke all on public.admin_notes, public.admin_tasks from anon;
revoke all on public.admin_notes, public.admin_tasks from authenticated;
grant select, insert, update, delete on public.admin_notes, public.admin_tasks to authenticated;

commit;

-- PostgREST phai biet hai bang moi thi API moi thay chung.
notify pgrst, 'reload schema';

-- Kiem lai: moi bang dung mot policy "Admin full access", va RLS dang bat (t).
--
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('admin_notes', 'admin_tasks');
--
--   select relname, relrowsecurity from pg_class
--   where oid in ('public.admin_notes'::regclass, 'public.admin_tasks'::regclass);
```

**Step 2: Người dùng chạy file (dừng lại và nhờ người dùng)**

Supabase Dashboard → SQL Editor → dán nội dung file → Run. File cần `restrict_blogs_to_admin.sql` đã chạy trước đó, vì cả hai dựa vào `app_metadata.admin`. Chạy câu kiểm ở cuối file.
Expected: 2 dòng, `admin_notes` và `admin_tasks`, cùng policy "Admin full access", cmd `ALL`. Câu thứ hai trả `t` cho cả hai bảng. Nếu file dừng ở bước kiểm với lỗi "Chua user nao co app_metadata.admin = true", chạy câu `update auth.users ...` ở đầu `restrict_blogs_to_admin.sql`, đăng xuất, đăng nhập lại, rồi chạy lại file này.

**Step 3: Commit**

```bash
git add supabase/add_admin_side_panel.sql
git commit -m "feat: tables for the admin side panel's notes and tasks"
```

### Task 9: Helper cho các route admin

**Files:**
- Create: `lib/admin-db.ts`
- Test: `lib/admin-db.test.ts`

**Step 1: Viết test**

```ts
import { describe, expect, it } from "vitest";
import { isMissingTableError, isUuid, parseTimestamp } from "@/lib/admin-db";

describe("isMissingTableError", () => {
  it("recognises both ways Supabase reports a missing table", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "…" })).toBe(true);
    expect(isMissingTableError({ code: "42P01", message: "…" })).toBe(true);
    expect(
      isMissingTableError({
        message: "Could not find the table 'public.admin_notes' in the schema cache",
      }),
    ).toBe(true);
  });

  it("leaves every other error alone", () => {
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError({ code: "42703", message: 'column "x" does not exist' })).toBe(false);
    expect(isMissingTableError({ code: "42501", message: "permission denied" })).toBe(false);
  });
});

describe("isUuid", () => {
  it("accepts a uuid and nothing else", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b")).toBe(true);
    expect(isUuid("3f2b8c1e")).toBe(false);
    expect(isUuid("../blogs")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});

describe("parseTimestamp", () => {
  it("normalises to ISO", () => {
    expect(parseTimestamp("2026-09-11T03:00:00.123456+00:00")).toBe("2026-09-11T03:00:00.123Z");
    expect(parseTimestamp("2026-09-11T10:00+07:00")).toBe("2026-09-11T03:00:00.000Z");
  });

  it("is null for anything it cannot read", () => {
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp("yesterday")).toBeNull();
    expect(parseTimestamp(1_757_000_000_000)).toBeNull();
  });

  it.each([
    ["a time with no offset, which each machine would read in its own zone", "2026-09-11T03:00:00"],
    ["a day that does not exist", "2026-02-30T00:00:00Z"],
    ["a date alone", "2026-09-11"],
    ["a year outside four digits", "+010000-01-01T00:00:00Z"],
    ["a loose date string", "11/09/2026"],
  ])("refuses %s", (_label, value) => {
    expect(parseTimestamp(value)).toBeNull();
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/admin-db.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/admin-db"`.

**Step 3: Viết code**

```ts
/**
 * Pure helpers shared by the /api/admin routes behind the side panel. Kept
 * apart from lib/admin-api.ts, which reaches the session through
 * next/headers, so testing these needs no mocks.
 */

export type DbError = { code?: string; message?: string; details?: string; hint?: string };

/**
 * The table is not there: supabase/add_admin_side_panel.sql was never run.
 * PostgREST reports it as PGRST205 (not in its schema cache), Postgres as 42P01.
 */
export function isMissingTableError(error: DbError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table/i.test(error.message ?? "")
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

// An instant with an explicit offset, as toISOString() and Postgres write it.
// Without an offset, a string would be read in whatever zone the server runs.
const ISO_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i;

/**
 * A timestamp from a request body as ISO; null when absent or unreadable.
 * Stricter than Date.parse, which also takes "1", "11/09/2026", strings with
 * no offset, and 2026-02-30 (rolled over to 2 March).
 */
export function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = ISO_INSTANT.exec(value);
  if (!match) return null;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/admin-db.test.ts`
Expected: PASS, 10 tests.

**Step 5: Commit**

```bash
git add lib/admin-db.ts lib/admin-db.test.ts
git commit -m "feat: recognise a missing table and check ids for the admin routes"
```

### Task 10: Chặn quyền và trả lỗi cho route

**Files:**
- Create: `lib/admin-api.ts`
- Modify: `lib/supabase-server.ts`
- Test: `lib/admin-api.test.ts`

Test chỉ giả `getUser`, lời gọi mạng tới Supabase Auth; mọi thứ khác chạy thật.

**Step 1: Viết code**

```ts
import { isMissingTableError, type DbError } from "@/lib/admin-db";
import { getUser, isAdminUser } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * The same gate as app/api/posts/[id]/route.ts, with one auth round trip:
 * cache() does not dedupe inside a route handler, so isAdmin() after
 * getUser() would ask Supabase for the user twice. The Supabase client a
 * route uses afterwards carries the caller's token, so RLS on the admin_*
 * tables is a second wall behind this one rather than the only one.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** A 400 with the reason, and a code when the caller acts on this refusal. */
export function badRequest(error: string, code?: string): NextResponse {
  return NextResponse.json(code ? { error, code } : { error }, { status: 400 });
}

/** A Supabase error as a response. A missing table gets a code the panel shows its own hint for. */
export function dbError(error: DbError, route: string): NextResponse {
  if (isMissingTableError(error)) {
    console.error(`[${route}] table missing: run supabase/add_admin_side_panel.sql`);
    return NextResponse.json({ error: "missing_table", code: "missing_table" }, { status: 500 });
  }
  console.error(
    `[${route}] supabase error`,
    error.code ?? "",
    error.message,
    error.details ?? "",
    error.hint ?? "",
  );
  return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
}
```

**Step 2: `isAdminUser` trong `lib/supabase-server.ts`**

Thêm hàm thuần `isAdminUser` và cho `isAdmin` dùng nó, để route chỉ hỏi Supabase một lần mỗi request (`cache()` không gộp lời gọi trong route handler).

Thay `isAdmin` cũ (từ `// Check if user is the admin (your email)` tới cuối file) bằng:

```ts
/**
 * Whether this user is the admin, by ADMIN_EMAIL. Unset means nobody, never
 * everybody. Pure, so a route handler can check a user it already has.
 */
export function isAdminUser(user: { email?: string } | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail) && user?.email === adminEmail;
}

// Check if user is the admin (your email)
export const isAdmin = cache(async () => isAdminUser(await getUser()));
```

Thay hai dòng comment trên `export const getUser` bằng:

```ts
// `cache()` dedupes within a server render: `getUser()` hits the Supabase auth
// server over the network, and several components used to each call it
// independently. It does not dedupe in a route handler; see isAdminUser.
```

**Step 3: Test cho cổng admin**

`lib/admin-api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

// Only the network call to Supabase Auth is faked; everything else runs as it is.
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase-server")>()),
  getUser,
}));

import { badRequest, dbError, requireAdmin } from "@/lib/admin-api";
import { isAdminUser } from "@/lib/supabase-server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getUser.mockReset();
});

describe("isAdminUser", () => {
  it("is nobody when ADMIN_EMAIL is unset or empty", () => {
    vi.stubEnv("ADMIN_EMAIL", undefined);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser({})).toBe(false);
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(isAdminUser({ email: "" })).toBe(false);
  });

  it("is only the user with the admin email", () => {
    vi.stubEnv("ADMIN_EMAIL", "me@example.com");
    expect(isAdminUser({ email: "me@example.com" })).toBe(true);
    expect(isAdminUser({ email: "you@example.com" })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("answers 401 signed out and 403 for anyone else, asking for the user once each time", async () => {
    vi.stubEnv("ADMIN_EMAIL", "me@example.com");
    getUser.mockResolvedValueOnce(null);
    expect((await requireAdmin())?.status).toBe(401);
    getUser.mockResolvedValueOnce({ email: "you@example.com" });
    expect((await requireAdmin())?.status).toBe(403);
    getUser.mockResolvedValueOnce({ email: "me@example.com" });
    expect(await requireAdmin()).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(3);
  });

  it("turns everyone away when ADMIN_EMAIL is unset", async () => {
    vi.stubEnv("ADMIN_EMAIL", undefined);
    getUser.mockResolvedValueOnce({});
    expect((await requireAdmin())?.status).toBe(403);
  });
});

describe("dbError", () => {
  it("reports a missing table by code, and falls back on an empty message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const missing = dbError({ code: "PGRST205" }, "test");
    expect(missing.status).toBe(500);
    expect(await missing.json()).toEqual({ error: "missing_table", code: "missing_table" });
    const empty = dbError({ code: "XX000", message: "" }, "test");
    expect(empty.status).toBe(500);
    expect(await empty.json()).toEqual({ error: "Database error" });
  });
});

describe("badRequest", () => {
  it("answers 400 with the reason, and the code when there is one", async () => {
    expect(await badRequest("sai").json()).toEqual({ error: "sai" });
    const coded = badRequest("sai giờ", "clock_ahead");
    expect(coded.status).toBe(400);
    expect(await coded.json()).toEqual({ error: "sai giờ", code: "clock_ahead" });
  });
});
```

Run: `pnpm vitest run lib/admin-api.test.ts`
Expected: PASS, 6 tests.

**Step 4: Kiểm kiểu**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

**Step 5: Commit**

```bash
git add lib/admin-api.ts lib/supabase-server.ts lib/admin-api.test.ts
git commit -m "feat: shared admin gate and error responses for the side panel routes"
```

### Task 11: Logic của note

**Files:**
- Create: `lib/admin-notes.ts`
- Test: `lib/admin-notes.test.ts`

**Step 1: Viết test**

```ts
import { describe, expect, it } from "vitest";
import {
  CLOCK_AHEAD,
  filterNotes,
  foldText,
  isBlankNote,
  MAX_CLOCK_AHEAD_MS,
  MAX_NOTE_LENGTH,
  notePreview,
  noteTitle,
  parseNoteInput,
  sortNotes,
  type AdminNote,
} from "@/lib/admin-notes";

function note(overrides: Partial<AdminNote>): AdminNote {
  return {
    id: overrides.body ?? "n",
    body: "",
    pinned: false,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("noteTitle / notePreview", () => {
  const body = "\n  Mua đồ Tết  \n- lạp vịt\n\n- bánh\n- mứt\n- hoa";

  it("takes the first non-blank line as the title", () => {
    expect(noteTitle(body)).toBe("Mua đồ Tết");
  });

  it("previews the next three non-blank lines", () => {
    expect(notePreview(body)).toBe("- lạp vịt\n- bánh\n- mứt");
  });

  it("reads Windows line endings the same way", () => {
    expect(noteTitle("Tiêu đề\r\n- a\r\n- b")).toBe("Tiêu đề");
    expect(notePreview("Tiêu đề\r\n- a\r\n- b")).toBe("- a\n- b");
  });

  it("has nothing to show for a blank note", () => {
    expect(noteTitle("  \n ")).toBe("");
    expect(notePreview("  \n ")).toBe("");
  });
});

describe("isBlankNote", () => {
  it("counts whitespace alone as blank", () => {
    expect(isBlankNote(" \n\t\r\n ")).toBe(true);
    expect(isBlankNote(" x ")).toBe(false);
  });
});

describe("sortNotes", () => {
  it("puts pinned notes first, then the most recently edited", () => {
    const sorted = sortNotes([
      note({ body: "old", updated_at: "2026-09-01T00:00:00.000Z" }),
      note({ body: "pinned", pinned: true, updated_at: "2026-08-01T00:00:00.000Z" }),
      note({ body: "new", updated_at: "2026-09-10T00:00:00.000Z" }),
    ]);
    expect(sorted.map((n) => n.body)).toEqual(["pinned", "new", "old"]);
  });

  it("compares timestamps as times, not as text", () => {
    // As text, "10:00:00+07:00" sorts after "03:00:00.900Z"; as a time it is
    // 03:00:00Z, the older of the two.
    const sorted = sortNotes([
      note({ body: "server", updated_at: "2026-09-11T10:00:00+07:00" }),
      note({ body: "browser", updated_at: "2026-09-11T03:00:00.900Z" }),
    ]);
    expect(sorted.map((n) => n.body)).toEqual(["browser", "server"]);
  });

  it("leaves the list it was given as it was", () => {
    const notes = [
      note({ body: "old", updated_at: "2026-09-01T00:00:00.000Z" }),
      note({ body: "new", updated_at: "2026-09-10T00:00:00.000Z" }),
    ];
    sortNotes(notes);
    expect(notes.map((n) => n.body)).toEqual(["old", "new"]);
  });
});

describe("foldText", () => {
  it("folds Vietnamese to plain lowercase, in either normal form", () => {
    expect(foldText("Tết")).toBe("tet");
    expect(foldText("Tết".normalize("NFD"))).toBe("tet");
    expect(foldText("ĐỒNG")).toBe("dong");
    expect(foldText("Ưu tiên ở Phường")).toBe("uu tien o phuong");
  });
});

describe("filterNotes", () => {
  const notes = [note({ body: "Mua đồ Tết" }), note({ body: "Tiền đồng" }), note({ body: "Report" })];

  it("ignores case and Vietnamese marks", () => {
    expect(filterNotes(notes, "tet").map((n) => n.body)).toEqual(["Mua đồ Tết"]);
    expect(filterNotes(notes, "DONG").map((n) => n.body)).toEqual(["Tiền đồng"]);
  });

  it("needs every word", () => {
    expect(filterNotes(notes, "mua tet").map((n) => n.body)).toEqual(["Mua đồ Tết"]);
    expect(filterNotes(notes, "mua report")).toEqual([]);
  });

  it("returns everything for a blank query", () => {
    expect(filterNotes(notes, "  ")).toHaveLength(3);
  });

  it("finds a note stored decomposed with a query typed precomposed", () => {
    expect(filterNotes([note({ body: "Mua đồ Tết".normalize("NFD") })], "tết")).toHaveLength(1);
  });
});

describe("parseNoteInput", () => {
  const T = "2026-09-11T03:00:00.000Z";

  it("accepts a body, a pin and the edit's time", () => {
    expect(parseNoteInput({ body: "hi", pinned: false, updated_at: T })).toEqual({
      ok: true,
      input: { body: "hi", pinned: false, updated_at: T },
    });
  });

  it("keeps a readable created_at, for Undo", () => {
    const result = parseNoteInput({
      body: "hi",
      pinned: true,
      updated_at: T,
      created_at: "2026-09-01T00:00:00Z",
    });
    expect(result).toMatchObject({ ok: true, input: { created_at: "2026-09-01T00:00:00.000Z" } });
  });

  it("takes only the fields it knows, whatever else is sent", () => {
    const result = parseNoteInput({ body: "hi", pinned: false, updated_at: T, id: "evil", deleted: true });
    expect(result.ok && Object.keys(result.input).sort()).toEqual(["body", "pinned", "updated_at"]);
  });

  it("accepts a body exactly at the limit", () => {
    expect(
      parseNoteInput({ body: "x".repeat(MAX_NOTE_LENGTH), pinned: false, updated_at: T }),
    ).toMatchObject({ ok: true });
  });

  it("drops NUL, which Postgres text cannot hold", () => {
    const nul = String.fromCharCode(0);
    expect(parseNoteInput({ body: `a${nul}b`, pinned: false, updated_at: T })).toMatchObject({
      ok: true,
      input: { body: "ab" },
    });
  });

  it("replaces half a surrogate pair, which Postgres cannot store either", () => {
    expect(parseNoteInput({ body: "a\uD83Db", pinned: false, updated_at: T })).toMatchObject({
      ok: true,
      input: { body: "a\uFFFDb" },
    });
  });

  it("reads updated_at as an instant, whatever offset it was written with", () => {
    expect(
      parseNoteInput({ body: "hi", pinned: false, updated_at: "2026-09-11T10:00:00+07:00" }),
    ).toMatchObject({ ok: true, input: { updated_at: "2026-09-11T03:00:00.000Z" } });
  });

  it("takes a null created_at as none", () => {
    const result = parseNoteInput({ body: "hi", pinned: false, updated_at: T, created_at: null });
    expect(result.ok && Object.keys(result.input).sort()).toEqual(["body", "pinned", "updated_at"]);
  });

  it("refuses a stamp more than five minutes ahead of the server", () => {
    const now = Date.parse(T) - MAX_CLOCK_AHEAD_MS;
    expect(parseNoteInput({ body: "hi", pinned: false, updated_at: T }, now)).toMatchObject({ ok: true });
    expect(parseNoteInput({ body: "hi", pinned: false, updated_at: T }, now - 1)).toMatchObject({
      ok: false,
      code: CLOCK_AHEAD,
    });
  });

  it.each([
    ["no body", { pinned: false, updated_at: T }],
    ["a body that is not text", { body: 1, pinned: false, updated_at: T }],
    ["a body that is too long", { body: "x".repeat(MAX_NOTE_LENGTH + 1), pinned: false, updated_at: T }],
    ["no pin", { body: "hi", updated_at: T }],
    ["no updated_at", { body: "hi", pinned: false }],
    ["an unreadable updated_at", { body: "hi", pinned: false, updated_at: "now" }],
    ["an unreadable created_at", { body: "hi", pinned: false, updated_at: T, created_at: "yesterday" }],
    ["nothing at all", null],
  ])("rejects %s", (_label, value) => {
    expect(parseNoteInput(value)).toMatchObject({ ok: false });
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/admin-notes.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/admin-notes"`.

**Step 3: Viết code**

`\p{M}` là mọi dấu kết hợp sau khi tách bằng NFD. `đ` không tách được nên phải thay riêng.

```ts
import { parseTimestamp } from "@/lib/admin-db";

/**
 * Ghi nhanh: the side panel's Keep-style notes, one row each in admin_notes.
 * Plain text; the first non-blank line doubles as the title.
 */
export type AdminNote = {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export const MAX_NOTE_LENGTH = 20_000;

/** The columns every notes route reads and returns. */
export const NOTE_COLUMNS = "id, body, pinned, created_at, updated_at";

const lines = (body: string) =>
  body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function noteTitle(body: string): string {
  return lines(body)[0] ?? "";
}

/** Up to `maxLines` non-blank lines after the title, for the card. */
export function notePreview(body: string, maxLines = 3): string {
  return lines(body).slice(1, 1 + maxLines).join("\n");
}

export function isBlankNote(body: string): boolean {
  return body.trim() === "";
}

/**
 * Pinned first, then most recently edited. Compared as dates, not strings:
 * rows from Postgres say `+00:00` with microseconds, rows made in the browser
 * say `Z` with milliseconds, and the two do not sort as text.
 */
export function sortNotes(notes: AdminNote[]): AdminNote[] {
  return [...notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
}

/** Lowercase, Vietnamese marks gone: "Tết" becomes "tet", "đồng" becomes "dong". */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");
}

/** Notes containing every word of the query, ignoring case and marks. */
export function filterNotes(notes: AdminNote[], query: string): AdminNote[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return notes;
  return notes.filter((note) => {
    const body = foldText(note.body);
    return words.every((word) => body.includes(word));
  });
}

export type NoteInput = { body: string; pinned: boolean; updated_at: string; created_at?: string };

/**
 * How far ahead of the server's clock an edit's stamp may be. The newest edit
 * wins, so a stamp from a clock running fast would pin the note: every edit
 * made on a right clock would count as older and lose until that time came.
 */
export const MAX_CLOCK_AHEAD_MS = 5 * 60_000;

/** The codes on the two notes PUT refusals the notes store acts on. */
export const CLOCK_AHEAD = "clock_ahead";
export const NOTE_DELETED = "note_deleted";

const NUL = String.fromCharCode(0);

/**
 * Checks a PUT body for /api/admin/notes/[id]. `updated_at` is the browser's
 * stamp for this edit and decides which of two saves wins, so it is required,
 * and refused when it is further ahead of `now` than MAX_CLOCK_AHEAD_MS.
 * `created_at` comes back only with Undo; unreadable, it is refused rather
 * than quietly replaced with now.
 */
export function parseNoteInput(
  value: unknown,
  now = Date.now(),
): { ok: true; input: NoteInput } | { ok: false; error: string; code?: string } {
  const data = (value ?? {}) as Record<string, unknown>;
  if (typeof data.body !== "string") return { ok: false, error: "body phải là chuỗi" };
  // Postgres stores neither NUL nor half of a surrogate pair, and left in,
  // either would fail every retry of the save. U+FFFD keeps the length.
  const body = data.body.split(NUL).join("").toWellFormed();
  if (body.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Note dài quá ${MAX_NOTE_LENGTH.toLocaleString("vi-VN")} ký tự` };
  }
  if (typeof data.pinned !== "boolean") return { ok: false, error: "pinned phải là true hoặc false" };

  const updatedAt = parseTimestamp(data.updated_at);
  if (!updatedAt) return { ok: false, error: "updated_at không đọc được" };
  if (Date.parse(updatedAt) - now > MAX_CLOCK_AHEAD_MS) {
    return {
      ok: false,
      error: "Giờ trên máy đang nhanh hơn server, chỉnh lại giờ máy rồi thử lại",
      code: CLOCK_AHEAD,
    };
  }

  let createdAt: string | undefined;
  if (data.created_at != null) {
    const parsed = parseTimestamp(data.created_at);
    if (!parsed) return { ok: false, error: "created_at không đọc được" };
    createdAt = parsed;
  }

  return {
    ok: true,
    input: {
      body,
      pinned: data.pinned,
      updated_at: updatedAt,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  };
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/admin-notes.test.ts`
Expected: PASS, 30 tests.

**Step 5: Commit**

```bash
git add lib/admin-notes.ts lib/admin-notes.test.ts
git commit -m "feat: titles, previews, order and search for quick notes"
```

### Task 12: API của note

**Files:**
- Create: `app/api/admin/notes/route.ts`
- Create: `app/api/admin/notes/[id]/route.ts`

**Step 1: Danh sách**

```ts
import { dbError, requireAdmin } from "@/lib/admin-api";
import { NOTE_COLUMNS } from "@/lib/admin-notes";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/notes
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .select(NOTE_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) return dbError(error, "admin notes GET");
  // Private notes: kept by no shared cache, and not by the browser's either.
  return NextResponse.json({ notes: data }, { headers: { "Cache-Control": "private, no-store" } });
}
```

**Step 2: Tạo, thay và xoá một note**

```ts
import { isUuid } from "@/lib/admin-db";
import { badRequest, dbError, requireAdmin } from "@/lib/admin-api";
import { NOTE_COLUMNS, NOTE_DELETED, parseNoteInput } from "@/lib/admin-notes";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT /api/admin/notes/[id]
// Creates the note or replaces it, and the newest edit wins. The browser
// stamps every edit with updated_at, and a write lands only over an older
// version, so a save that arrives late (a slow request, or the keepalive sent
// as a tab closes) cannot overwrite a newer one. The id comes from the browser
// too, which is what lets autosave, a new note's first save and Undo be one
// call. Answers with the note as stored: the newer one when this write lost.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const parsed = parseNoteInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error, parsed.code);

  const supabase = await createSupabaseServerClient();
  const row = { id, ...parsed.input };
  // Replaces the stored note only if it is older than this edit.
  const replaceOlder = () =>
    supabase
      .from("admin_notes")
      .update(row)
      .eq("id", id)
      .lt("updated_at", row.updated_at)
      .select(NOTE_COLUMNS);

  let result = await replaceOlder();
  if (!result.error && result.data.length === 0) {
    // Nothing older is stored: create the note. If it exists after all,
    // because another save created it in between, try replacing once more.
    result = await supabase
      .from("admin_notes")
      .upsert(row, { ignoreDuplicates: true })
      .select(NOTE_COLUMNS);
    if (!result.error && result.data.length === 0) result = await replaceOlder();
  }
  if (result.error) return dbError(result.error, "admin notes PUT");
  if (result.data.length > 0) return NextResponse.json({ note: result.data[0] });

  // A newer version is stored; hand it back so the browser can show it.
  const stored = await supabase.from("admin_notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle();
  if (stored.error) return dbError(stored.error, "admin notes PUT");
  // Deleted elsewhere in the moment between the write and this read.
  if (!stored.data) {
    return NextResponse.json(
      { error: "Note vừa bị xoá ở nơi khác", code: NOTE_DELETED },
      { status: 404 },
    );
  }
  return NextResponse.json({ note: stored.data });
}

// DELETE /api/admin/notes/[id]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admin_notes").delete().eq("id", id);

  if (error) return dbError(error, "admin notes DELETE");
  return NextResponse.json({ ok: true });
}
```

**Step 3: Kiểm**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

Với `pnpm dev` đang chạy:
- `curl -i http://localhost:3000/api/admin/notes` (không cookie). Expected: `401`.
- Đăng nhập trong trình duyệt, ở `/admin` mở console: `await (await fetch("/api/admin/notes")).json()`. Expected: `{ notes: [] }`.
- `await (await fetch("/api/admin/notes/not-a-uuid", { method: "DELETE" })).json()`. Expected: `{ error: "id không hợp lệ" }`.

**Step 4: Commit**

```bash
git add app/api/admin/notes/route.ts "app/api/admin/notes/[id]/route.ts"
git commit -m "feat: API for the admin side panel's quick notes"
```

### Task 13: Fetch phía client và báo lỗi

**Files:**
- Create: `lib/admin-fetch.ts`
- Test: `lib/admin-fetch.test.ts`
- Create: `components/admin/side-panel/load-status.ts`
- Create: `components/admin/side-panel/report-admin-error.ts`
- Create: `components/admin/side-panel/panel-notice.tsx`

**Step 1: Viết test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";

function respondWith(status: number, body: BodyInit | null) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(body, { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const respondJson = (status: number, value: unknown) => respondWith(status, JSON.stringify(value));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminFetch", () => {
  it("returns the JSON body", async () => {
    respondJson(200, { notes: [] });
    await expect(adminFetch("/api/admin/notes")).resolves.toEqual({ notes: [] });
  });

  it("sends JSON, uncached, when there is a body", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes/1", { method: "PUT", body: "{}" });
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({ method: "PUT", cache: "no-store" });
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
  });

  it("reads uncached, with no content type, when there is no body", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes");
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({ cache: "no-store" });
    expect(new Headers(init?.headers).has("content-type")).toBe(false);
  });

  it("keeps the caller's headers, whatever shape they come in", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes/1", {
      method: "PUT",
      body: "{}",
      headers: new Headers({ "X-Trace": "1" }),
    });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("x-trace")).toBe("1");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("keeps a content type the caller set", async () => {
    const fetchMock = respondJson(200, {});
    await adminFetch("/api/admin/notes/1", {
      method: "PUT",
      body: "{}",
      headers: [["content-type", "text/plain"]],
    });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("content-type")).toBe("text/plain");
  });

  it.each([401, 403])("reports %i as a sign-in to renew", async (status) => {
    respondJson(status, { error: "Unauthorized" });
    const error = await adminFetch("/api/admin/notes").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminFetchError);
    expect(error).toMatchObject({ kind: "auth" });
  });

  it("reports a table that was never created", async () => {
    respondJson(500, { error: "missing_table", code: "missing_table" });
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({ kind: "missing_table" });
  });

  it("passes the server's message through", async () => {
    respondJson(500, { error: "boom" });
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({
      kind: "server",
      message: "boom",
    });
  });

  it("passes the server's code through, for refusals a store acts on", async () => {
    respondJson(400, { error: "Giờ trên máy đang nhanh hơn server", code: "clock_ahead" });
    await expect(
      adminFetch("/api/admin/notes/1", { method: "PUT", body: "{}" }),
    ).rejects.toMatchObject({ kind: "server", code: "clock_ahead" });
  });

  it("reports an error page that is not JSON by its status", async () => {
    respondWith(504, "<html>Gateway Timeout</html>");
    await expect(adminFetch("/api/admin/notes")).rejects.toMatchObject({
      kind: "server",
      message: "Lỗi 504",
    });
  });

  it("refuses a success whose body cannot be read", async () => {
    respondWith(200, "<html>not json</html>");
    const error = await adminFetch("/api/admin/notes").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminFetchError);
    expect(error).toMatchObject({ kind: "server" });
  });

  it("returns nothing for 204", async () => {
    respondWith(204, null);
    await expect(adminFetch("/api/admin/notes/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("resolves a JSON null as null", async () => {
    respondWith(200, "null");
    await expect(adminFetch("/api/admin/notes")).resolves.toBeNull();
  });

  it("reports a request that never reached the server", async () => {
    const cause = new TypeError("Failed to fetch");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw cause;
      }),
    );
    const error = await adminFetch("/api/admin/notes").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminFetchError);
    expect(error).toMatchObject({ kind: "network" });
    expect((error as Error).cause).toBe(cause);
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/admin-fetch.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/admin-fetch"`.

**Step 3: Viết code**

```ts
export type AdminFetchErrorKind = "auth" | "missing_table" | "network" | "server";

export class AdminFetchError extends Error {
  readonly kind: AdminFetchErrorKind;
  /** The route's own code for the failure, when it sent one, such as "clock_ahead". */
  readonly code: string | undefined;

  constructor(
    kind: AdminFetchErrorKind,
    message: string,
    options?: ErrorOptions & { code?: string },
  ) {
    super(message, options);
    this.name = "AdminFetchError";
    this.kind = kind;
    this.code = options?.code;
  }
}

// What a body that is not JSON reads as, told apart from a JSON null.
const UNREADABLE = Symbol("unreadable");

/**
 * JSON fetch for the /api/admin routes behind the side panel, never cached.
 * Every failure comes out as an AdminFetchError whose `kind` the UI can act
 * on: a lapsed session and a table that was never created each get their own
 * message instead of one generic "something went wrong", and a refusal the
 * route gave a code keeps it. A success whose body cannot be read is a
 * failure too, not a null; a 204 resolves to undefined.
 */
export async function adminFetch<T>(
  url: string,
  init: Omit<RequestInit, "cache"> = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", headers });
  } catch (error) {
    throw new AdminFetchError("network", "Không kết nối được server", { cause: error });
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminFetchError("auth", "Cần đăng nhập lại");
  }
  if (response.status === 204) return undefined as T;

  // A platform error page (an HTML 504, say) is not JSON. A failure still has
  // its status to go on; a success has nothing, so it fails too.
  const data: unknown = await response.json().catch(() => UNREADABLE);
  if (!response.ok) {
    const body = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    if (body.code === "missing_table") {
      throw new AdminFetchError("missing_table", "Chưa chạy supabase/add_admin_side_panel.sql");
    }
    const message = typeof body.error === "string" ? body.error : `Lỗi ${response.status}`;
    const code = typeof body.code === "string" ? body.code : undefined;
    throw new AdminFetchError("server", message, { code });
  }
  if (data === UNREADABLE) {
    throw new AdminFetchError("server", `Lỗi ${response.status}: không đọc được phản hồi`);
  }
  return data as T;
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/admin-fetch.test.ts`
Expected: PASS, 15 tests.

**Step 5: Ba file nhỏ cho panel**

`components/admin/side-panel/load-status.ts`:

```ts
/** "idle" until the first answer comes back; panels show it as loading. */
export type LoadStatus = "idle" | "loading" | "ready" | "missing_table" | "error";
```

`components/admin/side-panel/report-admin-error.ts`. Hết phiên (hay tài khoản không phải admin) thì một toast duy nhất, không tự tắt, và tự gỡ khi có request đi qua được (`clearAdminSession`). Đăng nhập lại ở tab khác rồi lưu lại thì giữ được chữ chưa lưu; tải lại trang thì mất phần đó. Tải lại là tải cả trang chứ không điều hướng client, vì server mới là nơi quyết định có hiện màn đăng nhập hay không, và nó chỉ hỏi ở một request mới.

```ts
"use client";

import { AdminFetchError } from "@/lib/admin-fetch";
import { toast } from "sonner";

const SESSION_TOAST = "admin-session";
// Whether the sign-in toast is up, so a request that gets through can take it down.
let sessionToastUp = false;

/** One toast for a failed side-panel request, with a way back in when the session lapsed. */
export function reportAdminError(error: unknown, action: string): void {
  if (error instanceof AdminFetchError && error.kind === "auth") {
    // One toast however many stores hit this, kept until dismissed or until a
    // request gets through again (clearAdminSession): it is the only word on
    // why saves stop. Signing in again in another tab keeps the unsaved text,
    // since the cookies are shared. A reload here loses it, and is a full
    // reload rather than a client navigation because the server decides
    // whether the login screen is due, and only on a fresh request.
    sessionToastUp = true;
    toast.error("Cần đăng nhập lại", {
      id: SESSION_TOAST,
      duration: Infinity,
      description:
        "Đăng nhập lại bằng tài khoản admin ở tab khác rồi lưu lại để giữ chữ chưa lưu. Tải lại trang thì mất phần chưa lưu.",
      action: { label: "Tải lại", onClick: () => window.location.reload() },
      onDismiss: () => {
        sessionToastUp = false;
      },
    });
    return;
  }
  // Only our own messages are fit to show. Anything else is a bug: log it for
  // whoever fixes it, and say something plain.
  if (!(error instanceof AdminFetchError)) console.error(error);
  toast.error(`${action} không thành công`, {
    description: error instanceof AdminFetchError ? error.message : "Có lỗi không mong đợi.",
  });
}

/** Takes the sign-in toast down once a request gets through again. */
export function clearAdminSession(): void {
  if (!sessionToastUp) return;
  sessionToastUp = false;
  toast.dismiss(SESSION_TOAST);
}
```

`components/admin/side-panel/panel-notice.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import type { LoadStatus } from "./load-status";

/** What a panel shows instead of its list when loading failed. */
export function PanelNotice({
  kind,
  onRetry,
}: {
  kind: Extract<LoadStatus, "missing_table" | "error">;
  onRetry: () => void;
}) {
  return (
    // A status region: no toast fires for a missing table, so this is the only word on it.
    <div role="status" className="space-y-3 p-4 text-sm text-muted-foreground">
      {kind === "missing_table" ? (
        <p>
          Chưa có bảng dữ liệu. Chạy{" "}
          <code className="font-mono text-xs">supabase/add_admin_side_panel.sql</code> trong SQL
          Editor của Supabase rồi thử lại.
        </p>
      ) : (
        <p>Không tải được dữ liệu.</p>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}
```

**Step 6: Kiểm kiểu**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

**Step 7: Commit**

```bash
git add lib/admin-fetch.ts lib/admin-fetch.test.ts components/admin/side-panel/load-status.ts components/admin/side-panel/report-admin-error.ts components/admin/side-panel/panel-notice.tsx
git commit -m "feat: typed fetch errors and notices for the side panel"
```

### Task 14: Kho dữ liệu của note

**Files:**
- Create: `components/admin/side-panel/use-notes-store.ts`
- Modify: `components/admin/side-panel/side-panel-provider.tsx`
- Modify: `lib/admin-notes.ts`
- Test: `lib/admin-notes.test.ts`

Những điểm dễ sai trong file này:
- Mỗi note chỉ có một request đang chạy (`enqueue`). Thiếu nó thì lần lưu chậm có thể tới sau lần lưu mới hơn, hoặc tạo lại note vừa xoá.
- Mỗi lần lưu gửi kèm `updated_at` của lần sửa đó (`noteSaveBody`), đóng dấu sau bản mà nó sửa lên (`nextStamp`), và server chỉ giữ bản mới nhất. Server trả về bản mới hơn thì kho hiện bản đó, trừ khi đã có lần sửa mới hơn đang chờ lưu.
- Server từ chối dấu vì giờ máy nhanh (`clock_ahead`) thì lần lưu sau đóng dấu lại từ bản server đang giữ, không từ dấu bị từ chối; nếu không, chỉnh giờ xong vẫn bị từ chối cho tới khi giờ thật đuổi kịp. Note bị xoá ở nơi khác (`note_deleted`) thì bỏ khỏi danh sách, và lần lưu còn xếp hàng của nó không được gửi.
- Hai lần lưu của một note cùng hỏng thì chỉ bản mới nhất đã gửi được giữ lại để thử lại (`latest`); nếu không, lần thử lại đưa chữ cũ hơn trở lại màn hình.
- Danh sách chỉ tải lại (khi quay lại tab, hay mở lại panel) lúc không còn gì chờ lưu hay đang gửi, và bỏ kết quả nếu trong lúc tải có gì đổi ở đây. Nếu không, danh sách đọc trước khi một lần lưu tới nơi sẽ đưa chữ cũ trở lại màn hình, và lần gõ sau lưu đè lên bản mới hơn.
- Lần nạp đầu không gọi setState trước khi request đi (`status` giữ `"idle"` tới khi có kết quả). Gọi `setStatus("loading")` trong effect sẽ thêm warning `react-hooks/set-state-in-effect`.
- `pagehide` gửi lại các note chưa lưu bằng `keepalive`, để đóng tab trong nửa giây sau khi gõ không mất chữ. Trình duyệt chỉ cho tổng cộng 64 KiB, nên `keepaliveSaves` lấy note sửa gần nhất trước và tính theo byte.

**Step 1: Test cho ba hàm thuần**

Trong `lib/admin-notes.test.ts`, khối import thêm `keepaliveSaves`, `nextStamp` và `noteSaveBody`, và ba khối `describe` sau được thêm vào cuối file:

```ts
import {
  CLOCK_AHEAD,
  filterNotes,
  foldText,
  isBlankNote,
  keepaliveSaves,
  MAX_CLOCK_AHEAD_MS,
  MAX_NOTE_LENGTH,
  nextStamp,
  notePreview,
  noteSaveBody,
  noteTitle,
  parseNoteInput,
  sortNotes,
  type AdminNote,
} from "@/lib/admin-notes";
```

```ts
describe("noteSaveBody", () => {
  it("is a body the PUT accepts, with the edit's time", () => {
    const saved = note({ body: "Mua đồ Tết", pinned: true, updated_at: "2026-09-11T03:00:00.000Z" });
    expect(parseNoteInput(JSON.parse(noteSaveBody(saved)))).toEqual({
      ok: true,
      input: {
        body: "Mua đồ Tết",
        pinned: true,
        updated_at: "2026-09-11T03:00:00.000Z",
        created_at: "2026-09-01T00:00:00.000Z",
      },
    });
  });
});

describe("keepaliveSaves", () => {
  const edited = (body: string, updated_at: string) => note({ body, updated_at });

  it("sends the newest edit first", () => {
    const saves = keepaliveSaves(
      [edited("old", "2026-09-11T01:00:00.000Z"), edited("new", "2026-09-11T02:00:00.000Z")],
      60_000,
    );
    expect(saves.map((save) => save.id)).toEqual(["new", "old"]);
  });

  it("skips a note too big for what is left, and still sends a smaller one", () => {
    const saves = keepaliveSaves(
      [edited("x".repeat(500), "2026-09-11T02:00:00.000Z"), edited("nhỏ", "2026-09-11T01:00:00.000Z")],
      300,
    );
    expect(saves.map((save) => save.id)).toEqual(["nhỏ"]);
  });

  it("counts bytes, not characters", () => {
    // "ệ" is one character and three bytes in UTF-8.
    const long = edited("ệ".repeat(100), "2026-09-11T01:00:00.000Z");
    const characters = noteSaveBody(long).length;
    expect(keepaliveSaves([long], characters)).toEqual([]);
    expect(keepaliveSaves([long], characters + 200)).toHaveLength(1);
  });
});

describe("nextStamp", () => {
  const NOW = Date.parse("2026-09-11T03:00:00.000Z");

  it("is now, for a version stamped earlier", () => {
    expect(nextStamp("2026-09-11T02:59:00.000Z", NOW)).toBe("2026-09-11T03:00:00.000Z");
  });

  it("comes just after a version stamped by a clock running fast", () => {
    expect(nextStamp("2026-09-11T03:04:00.000Z", NOW)).toBe("2026-09-11T03:04:00.001Z");
  });

  it("comes after a Postgres stamp with microseconds", () => {
    expect(nextStamp("2026-09-11T03:00:00.000500+00:00", NOW)).toBe("2026-09-11T03:00:00.001Z");
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/admin-notes.test.ts`
Expected: FAIL ở 7 test mới, vì `noteSaveBody`, `nextStamp` và `keepaliveSaves` chưa có.

**Step 3: Ba hàm trong `lib/admin-notes.ts`**

Thêm vào cuối file:

```ts
/** The PUT body for a note: what parseNoteInput reads, this edit's time included. */
export function noteSaveBody(note: AdminNote): string {
  return JSON.stringify({
    body: note.body,
    pinned: note.pinned,
    updated_at: note.updated_at,
    created_at: note.created_at,
  });
}

/**
 * The stamp for an edit made on top of a version stamped `previous`: now, or
 * a millisecond after `previous` when this device's clock is behind it. The
 * newest edit wins, so an edit on a version from a clock running fast must
 * still count as newer, and two edits in one millisecond must not tie.
 */
export function nextStamp(previous: string, now = Date.now()): string {
  const after = Date.parse(previous) + 1;
  return new Date(Number.isNaN(after) ? now : Math.max(now, after)).toISOString();
}

/**
 * What to send with keepalive as the page goes away. Browsers refuse keepalive
 * requests past 64 KiB in flight altogether, so this takes the newest edits
 * first, within `budget` bytes, and skips a note too big for what is left so
 * that smaller ones behind it still go.
 */
export function keepaliveSaves(
  notes: AdminNote[],
  budget: number,
): { id: string; body: string }[] {
  const encoder = new TextEncoder();
  const saves: { id: string; body: string }[] = [];
  let left = budget;
  const newestFirst = [...notes].sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
  for (const note of newestFirst) {
    const body = noteSaveBody(note);
    const size = encoder.encode(body).length;
    if (size > left) continue;
    left -= size;
    saves.push({ id: note.id, body });
  }
  return saves;
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/admin-notes.test.ts`
Expected: PASS, 37 tests.

**Step 5: Viết kho**

```ts
"use client";

import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";
import {
  CLOCK_AHEAD,
  isBlankNote,
  keepaliveSaves,
  nextStamp,
  NOTE_DELETED,
  noteSaveBody,
  type AdminNote,
} from "@/lib/admin-notes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { LoadStatus } from "./load-status";
import { clearAdminSession, reportAdminError } from "./report-admin-error";

export type SaveState = "dirty" | "saving" | "saved" | "error";

export type NotesStore = {
  status: LoadStatus;
  notes: AdminNote[];
  saveState: Record<string, SaveState>;
  reload: () => void;
  create: (body: string) => AdminNote;
  edit: (note: AdminNote, body: string) => void;
  togglePin: (note: AdminNote) => void;
  remove: (note: AdminNote) => void;
  /** Save now whatever is waiting out the autosave delay. */
  flush: (id: string) => void;
  /** Leaving a note with nothing in it deletes it, quietly. */
  discardIfBlank: (id: string) => void;
};

const AUTOSAVE_MS = 500;
// Under the 64 KiB browsers allow for keepalive requests in flight at once.
const KEEPALIVE_BUDGET = 60_000;

const noteUrl = (id: string) => `/api/admin/notes/${id}`;

/**
 * The notes behind Ghi nhanh. Typing autosaves half a second after the last
 * key, and each note sends one request at a time. Every edit is stamped just
 * after the version it was made on, and the server keeps the newest, so a
 * save that arrives late (the keepalive as a tab closes, another tab) cannot
 * overwrite a newer one; when it loses, the newer version shows here too, and
 * a note deleted elsewhere leaves here. The list is fetched again when the tab
 * comes back or the panel opens again, but only while nothing here is waiting
 * to save.
 */
export function useNotesStore(enabled: boolean): NotesStore {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});

  // Read by timers and queued requests, never by render, so refs rather than state.
  const pending = useRef(new Map<string, AdminNote>()); // latest unsaved version of each note
  const latest = useRef(new Map<string, AdminNote>()); // newest version handed to a request
  const timers = useRef(new Map<string, number>());
  const queues = useRef(new Map<string, Promise<unknown>>()); // the request each note has in flight
  const inFlight = useRef(0); // requests queued or sent and not yet settled, all notes together
  const bodies = useRef(new Map<string, string>()); // latest text of each note still in the list
  const failing = useRef(new Set<string>()); // notes whose failure has been toasted already
  const accepted = useRef(new Map<string, string>()); // stamp of the version the server holds
  const clockRefused = useRef(new Set<string>()); // notes whose last stamp was refused as ahead
  const loaded = useRef(false); // the first list is in
  const changes = useRef(0); // counts changes made to the list here

  /** setNotes for a change made here, so a list fetched meanwhile knows it is stale. */
  const changeNotes = useCallback((update: (list: AdminNote[]) => AdminNote[]) => {
    changes.current += 1;
    setNotes(update);
  }, []);

  const setState = useCallback((id: string, state: SaveState | null) => {
    setSaveState((states) => {
      const next = { ...states };
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });
  }, []);

  /** Runs `request` once whatever this note already has in flight has settled. */
  const enqueue = useCallback(<T>(id: string, request: () => Promise<T>): Promise<T> => {
    inFlight.current += 1;
    const run = (queues.current.get(id) ?? Promise.resolve()).then(request);
    queues.current.set(
      id,
      run
        .catch(() => undefined)
        .finally(() => {
          inFlight.current -= 1;
        }),
    );
    return run;
  }, []);

  /**
   * The stamp for an edit of `note`: just after its version, unless the server
   * refused that stamp as ahead of its clock. Then just after the version the
   * server holds, so a clock put right is not held back by what it stamped
   * while it was wrong.
   */
  const stampFor = useCallback((note: AdminNote) => {
    if (!clockRefused.current.has(note.id)) return nextStamp(note.updated_at);
    clockRefused.current.delete(note.id);
    return nextStamp(accepted.current.get(note.id) ?? "");
  }, []);

  /** Drops the note from the list and from everything waiting to save it. */
  const forget = useCallback(
    (id: string) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      pending.current.delete(id);
      latest.current.delete(id);
      bodies.current.delete(id);
      failing.current.delete(id);
      accepted.current.delete(id);
      clockRefused.current.delete(id);
      setState(id, null);
      changeNotes((list) => list.filter((n) => n.id !== id));
    },
    [changeNotes, setState],
  );

  const flush = useCallback(
    (id: string) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      let note = pending.current.get(id);
      if (!note) return;
      pending.current.delete(id);
      if (clockRefused.current.has(id)) {
        // A retry after its stamp was refused as ahead of the server's clock:
        // stamp it again, now that the clock may have been put right.
        const restamped = { ...note, updated_at: stampFor(note) };
        changeNotes((list) => list.map((n) => (n.id === id ? restamped : n)));
        note = restamped;
      }
      const sent = note;
      latest.current.set(id, sent);
      setState(id, "saving");

      enqueue(id, () =>
        // Forgotten while this waited its turn (deleted here, or elsewhere):
        // sending it would put the row back.
        bodies.current.has(id)
          ? adminFetch<{ note: AdminNote }>(noteUrl(id), { method: "PUT", body: noteSaveBody(sent) })
          : Promise.reject(new Error("forgotten")),
      ).then(
        ({ note: stored }) => {
          clearAdminSession();
          failing.current.delete(id);
          // Deleted here meanwhile: nothing left to show.
          if (!bodies.current.has(id)) return;
          accepted.current.set(id, stored.updated_at);
          // An edit made while this was in flight reports its own state, and
          // its own save decides which version stays.
          if (pending.current.has(id)) return;
          setState(id, "saved");
          // The server kept a newer version, saved in another tab or on another
          // device: show that one.
          if (Date.parse(stored.updated_at) <= Date.parse(sent.updated_at)) return;
          bodies.current.set(id, stored.body);
          changeNotes((list) => list.map((n) => (n.id === id ? stored : n)));
          toast("Note này vừa được sửa ở nơi khác", { description: "Đang hiện bản mới hơn." });
        },
        (error) => {
          // Deleted here meanwhile: nothing left to save.
          if (!bodies.current.has(id)) return;
          const code = error instanceof AdminFetchError ? error.code : undefined;
          if (code === NOTE_DELETED) {
            // Deleted in another tab or on another device, the newest change of all.
            forget(id);
            toast("Note này vừa bị xoá ở nơi khác");
            return;
          }
          if (code === CLOCK_AHEAD) clockRefused.current.add(id);
          // Keep the text in line: the next keystroke, or a click on the dot,
          // retries. Only the newest version sent goes back, never an older
          // one whose failure came in after a newer one was sent.
          if (!pending.current.has(id) && latest.current.get(id) === sent) {
            pending.current.set(id, sent);
          }
          setState(id, "error");
          if (!failing.current.has(id)) {
            failing.current.add(id);
            reportAdminError(error, "Lưu note");
          }
        },
      );
    },
    [enqueue, setState, changeNotes, stampFor, forget],
  );

  const schedule = useCallback(
    (note: AdminNote) => {
      pending.current.set(note.id, note);
      bodies.current.set(note.id, note.body);
      setState(note.id, "dirty");
      window.clearTimeout(timers.current.get(note.id));
      timers.current.set(
        note.id,
        window.setTimeout(() => flush(note.id), AUTOSAVE_MS),
      );
    },
    [flush, setState],
  );

  /**
   * `background`: a refresh under a list already showing. It keeps that list
   * if it fails, and gives way to any change made here while it was loading.
   */
  const fetchNotes = useCallback(async (background = false) => {
    const changesBefore = changes.current;
    try {
      const data = await adminFetch<{ notes: AdminNote[] }>("/api/admin/notes");
      clearAdminSession();
      if (background && changes.current !== changesBefore) return;
      bodies.current = new Map(data.notes.map((note) => [note.id, note.body]));
      accepted.current = new Map(data.notes.map((note) => [note.id, note.updated_at]));
      setNotes(data.notes);
      loaded.current = true;
      setStatus("ready");
    } catch (error) {
      const kind = error instanceof AdminFetchError ? error.kind : null;
      if (background) {
        // The list already showing stays; only a lapsed session is worth a word.
        if (kind === "auth") reportAdminError(error, "Tải ghi nhanh");
        return;
      }
      setStatus(kind === "missing_table" ? "missing_table" : "error");
      if (kind !== "missing_table") reportAdminError(error, "Tải ghi nhanh");
    }
  }, []);

  /** The list again, once it has loaded, and only while nothing here is waiting to save. */
  const refresh = useCallback(() => {
    if (!loaded.current || pending.current.size > 0 || inFlight.current > 0) return;
    void fetchNotes(true);
  }, [fetchNotes]);

  // The first load once the panel is showing, then a refresh each time it
  // shows again. Status stays "idle" until the first answer is in, so nothing
  // sets state before the request goes out.
  const started = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (started.current) {
      refresh();
      return;
    }
    started.current = true;
    void fetchNotes();
  }, [enabled, fetchNotes, refresh]);

  // Back to this tab: another tab may have changed the notes meanwhile.
  useEffect(() => {
    if (!enabled) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, refresh]);

  // A tab closed inside the autosave delay would lose the last half second of
  // typing. keepalive lets those saves outlive the page; keepaliveSaves keeps
  // them under the browser's limit, newest edit first. A note whose stamp was
  // refused as ahead of the server's clock goes out stamped again.
  useEffect(() => {
    const onPageHide = () => {
      const unsaved = [...pending.current.values()].map((note) =>
        clockRefused.current.has(note.id)
          ? { ...note, updated_at: nextStamp(accepted.current.get(note.id) ?? "") }
          : note,
      );
      for (const save of keepaliveSaves(unsaved, KEEPALIVE_BUDGET)) {
        void fetch(noteUrl(save.id), {
          method: "PUT",
          body: save.body,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const create = useCallback(
    (body: string) => {
      const now = new Date().toISOString();
      const note: AdminNote = {
        id: crypto.randomUUID(),
        body,
        pinned: false,
        created_at: now,
        updated_at: now,
      };
      changeNotes((list) => [note, ...list]);
      schedule(note);
      return note;
    },
    [changeNotes, schedule],
  );

  const edit = useCallback(
    (note: AdminNote, body: string) => {
      const next = { ...note, body, updated_at: stampFor(note) };
      changeNotes((list) => list.map((n) => (n.id === note.id ? next : n)));
      schedule(next);
    },
    [changeNotes, schedule, stampFor],
  );

  const togglePin = useCallback(
    (note: AdminNote) => {
      const next = { ...note, pinned: !note.pinned, updated_at: stampFor(note) };
      changeNotes((list) => list.map((n) => (n.id === note.id ? next : n)));
      schedule(next);
      flush(next.id);
    },
    [changeNotes, schedule, flush, stampFor],
  );

  const restore = useCallback(
    (note: AdminNote) => {
      changeNotes((list) => [note, ...list.filter((n) => n.id !== note.id)]);
      schedule(note);
      flush(note.id);
    },
    [changeNotes, schedule, flush],
  );

  const remove = useCallback(
    (note: AdminNote) => {
      const acceptedStamp = accepted.current.get(note.id);
      forget(note.id);
      enqueue(note.id, () => adminFetch(noteUrl(note.id), { method: "DELETE" })).then(
        () => {
          clearAdminSession();
          toast.success("Đã xoá note", {
            action: { label: "Undo", onClick: () => restore(note) },
          });
        },
        (error) => {
          // Still on the server: back in the list, as the server knows it.
          bodies.current.set(note.id, note.body);
          if (acceptedStamp) accepted.current.set(note.id, acceptedStamp);
          changeNotes((list) => [note, ...list]);
          reportAdminError(error, "Xoá note");
        },
      );
    },
    [forget, enqueue, restore, changeNotes],
  );

  const discardIfBlank = useCallback(
    (id: string) => {
      const body = bodies.current.get(id);
      if (body === undefined || !isBlankNote(body)) return;
      forget(id);
      // The row may not exist yet; deleting nothing is fine.
      void enqueue(id, () => adminFetch(noteUrl(id), { method: "DELETE" })).catch(() => undefined);
    },
    [forget, enqueue],
  );

  const reload = useCallback(() => {
    setStatus("loading");
    void fetchNotes();
  }, [fetchNotes]);

  return useMemo(
    () => ({
      status,
      notes,
      saveState,
      reload,
      create,
      edit,
      togglePin,
      remove,
      flush,
      discardIfBlank,
    }),
    [status, notes, saveState, reload, create, edit, togglePin, remove, flush, discardIfBlank],
  );
}
```

**Step 6: Nối vào provider**

Trong `side-panel-provider.tsx`:

Thêm import, ngay sau khối `import { … } from "react";`:

```tsx
import { useNotesStore, type NotesStore } from "./use-notes-store";
```

Thêm vào cuối type `SidePanelContextValue`:

```tsx
  notes: NotesStore;
```

Thêm ngay trước `const value = useMemo(`:

```tsx
  const notesShowing = panel === "notes" || (sheetOpen && sheetTab === "notes");
  const notes = useNotesStore(admin && notesShowing);
```

Thêm `notes` vào object trong `useMemo` và vào mảng deps của nó.

**Step 7: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 8: Commit**

```bash
git add lib/admin-notes.ts lib/admin-notes.test.ts components/admin/side-panel/use-notes-store.ts components/admin/side-panel/side-panel-provider.tsx
git commit -m "feat: quick note store with autosave, one request per note at a time"
```

### Task 15: Panel Ghi nhanh

**Files:**
- Create: `components/admin/side-panel/notes-panel.tsx`
- Modify: `components/admin/side-panel/panel-body.tsx`

**Step 1: Panel**

Ô "Ghi gì đó…" để bộ gõ IME gõ xong cả chữ rồi mới chuyển sang textarea (`onCompositionEnd`). Nếu chuyển giữa chừng, chữ đang gõ có dấu sẽ bị cắt đôi. Rời một note, bằng nút quay lại hay bằng cách đóng panel, sẽ lưu phần còn chờ và xoá note nếu nó trống (effect cleanup theo `editingId`). Ô ghi và textarea có `maxLength` bằng `MAX_NOTE_LENGTH`, để trình duyệt dừng ở giới hạn của server thay vì để mọi lần lưu đều bị từ chối.

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  filterNotes,
  MAX_NOTE_LENGTH,
  notePreview,
  noteTitle,
  sortNotes,
  type AdminNote,
} from "@/lib/admin-notes";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, PinIcon, PinOffIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PanelNotice } from "./panel-notice";
import { useSidePanel } from "./side-panel-provider";
import type { SaveState } from "./use-notes-store";

export function NotesPanel({ autoFocus }: { autoFocus: boolean }) {
  const { notes } = useSidePanel();
  const { flush, discardIfBlank } = notes;
  const [editingId, setEditingId] = useState<string | null>(null);
  // null while the search box is closed; the capture box sits there instead.
  const [query, setQuery] = useState<string | null>(null);

  // Leaving a note, by the back arrow or by closing the panel, saves what is
  // waiting and drops the note if nothing was written in it.
  useEffect(() => {
    if (!editingId) return;
    return () => {
      flush(editingId);
      discardIfBlank(editingId);
    };
  }, [editingId, flush, discardIfBlank]);

  const visible = useMemo(
    () => filterNotes(sortNotes(notes.notes), query ?? ""),
    [notes.notes, query],
  );
  const editing = editingId ? notes.notes.find((note) => note.id === editingId) : undefined;

  if (notes.status === "missing_table" || notes.status === "error") {
    return <PanelNotice kind={notes.status} onRetry={notes.reload} />;
  }

  if (editing) {
    return (
      <NoteEditor
        note={editing}
        saveState={notes.saveState[editing.id]}
        onBack={() => setEditingId(null)}
      />
    );
  }

  const ready = notes.status === "ready";
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-1.5">
        {query === null ? (
          <CaptureBox
            autoFocus={autoFocus}
            disabled={!ready}
            onStart={(body) => setEditingId(notes.create(body).id)}
          />
        ) : (
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.stopPropagation();
              setQuery(null);
            }}
            placeholder="Tìm trong ghi nhanh…"
            className="h-9"
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setQuery((q) => (q === null ? "" : null))}
          aria-label={query === null ? "Tìm" : "Đóng tìm kiếm"}
        >
          {query === null ? <SearchIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
        </Button>
      </div>

      {(notes.status === "idle" || notes.status === "loading") && (
        <p className="py-6 text-center text-xs text-muted-foreground">Đang tải…</p>
      )}
      {ready && visible.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {query ? "Không có note nào khớp." : "Chưa có ghi nhanh nào."}
        </p>
      )}

      <ul className="space-y-2">
        {visible.map((note) => (
          <li key={note.id}>
            <NoteCard
              note={note}
              failed={notes.saveState[note.id] === "error"}
              onOpen={() => setEditingId(note.id)}
            />
          </li>
        ))}
      </ul>

      <Link
        href="/admin/notes"
        className="block pt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Ghi chú riêng trong bài →
      </Link>
    </div>
  );
}

/**
 * The "take a note" box. The first character typed becomes a new note and the
 * editor takes over with the cursor after it. An IME composition is left to
 * finish first, so the switch never cuts a character in half.
 */
function CaptureBox({
  autoFocus,
  disabled,
  onStart,
}: {
  autoFocus: boolean;
  disabled: boolean;
  onStart: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  // Not the autoFocus attribute: the box is disabled until notes have loaded,
  // and a disabled input cannot take focus.
  useEffect(() => {
    if (autoFocus && !disabled) input.current?.focus();
  }, [autoFocus, disabled]);

  const take = (value: string) => {
    if (!value.trim()) {
      setDraft(value);
      return;
    }
    setDraft("");
    onStart(value);
  };

  return (
    <Input
      ref={input}
      value={draft}
      disabled={disabled}
      maxLength={MAX_NOTE_LENGTH}
      placeholder="Ghi gì đó…"
      className="h-9"
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        take(event.currentTarget.value);
      }}
      onChange={(event) => {
        if (composing.current) setDraft(event.target.value);
        else take(event.target.value);
      }}
    />
  );
}

function NoteCard({
  note,
  failed,
  onOpen,
}: {
  note: AdminNote;
  failed: boolean;
  onOpen: () => void;
}) {
  const title = noteTitle(note.body);
  const preview = notePreview(note.body);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex items-start gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            !title && "text-muted-foreground",
          )}
        >
          {title || "Note trống"}
        </span>
        {note.pinned && (
          <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Đã ghim" />
        )}
        {failed && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" title="Chưa lưu được" />
        )}
      </span>
      {preview && (
        <span className="mt-1 line-clamp-3 block whitespace-pre-line text-xs text-muted-foreground">
          {preview}
        </span>
      )}
    </button>
  );
}

// Same colours as the editor's save dot (app/admin/edit/[id]/edit-post-client.tsx).
const SAVE_DOT: Record<SaveState, { dot: string; label: string }> = {
  dirty: { dot: "bg-amber-500", label: "Chưa lưu" },
  saving: { dot: "bg-amber-500 animate-pulse", label: "Đang lưu" },
  saved: { dot: "bg-green-500", label: "Đã lưu" },
  error: { dot: "bg-destructive", label: "Lưu lỗi, bấm để thử lại" },
};

function NoteEditor({
  note,
  saveState,
  onBack,
}: {
  note: AdminNote;
  saveState: SaveState | undefined;
  onBack: () => void;
}) {
  const { notes } = useSidePanel();
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Cursor at the end, where the capture box left off.
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Grow with the text, so the panel scrolls rather than a box inside it.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [note.body]);

  const dot = saveState ? SAVE_DOT[saveState] : null;

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-background px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack}
          aria-label="Về danh sách"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        {dot && (
          <button
            type="button"
            disabled={saveState !== "error"}
            onClick={() => notes.flush(note.id)}
            title={dot.label}
            aria-label={dot.label}
            className="grid h-8 w-8 place-items-center disabled:cursor-default"
          >
            <span className={cn("h-2 w-2 rounded-full", dot.dot)} />
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => notes.togglePin(note)}
            aria-label={note.pinned ? "Bỏ ghim" : "Ghim"}
            aria-pressed={note.pinned}
          >
            {note.pinned ? <PinOffIcon className="h-4 w-4" /> : <PinIcon className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              notes.remove(note);
              onBack();
            }}
            aria-label="Xoá note"
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <textarea
        ref={textarea}
        value={note.body}
        onChange={(event) => notes.edit(note, event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Ghi gì đó…"
        rows={6}
        className="w-full flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none"
      />
    </div>
  );
}
```

**Step 2: Nối vào panel body**

Thay `components/admin/side-panel/panel-body.tsx` bằng:

```tsx
"use client";

import type { AdminPanelId } from "@/lib/admin-panel-prefs";
import { NotesPanel } from "./notes-panel";
import { panelMeta } from "./panels";

/** `autoFocus`: put the cursor in the panel's input. Not when restored on page load. */
export function PanelBody({ id, autoFocus = false }: { id: AdminPanelId; autoFocus?: boolean }) {
  if (id === "notes") return <NotesPanel autoFocus={autoFocus} />;
  return <p className="p-4 text-sm text-muted-foreground">{panelMeta(id).label}: sắp có.</p>;
}
```

**Step 3: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 4: Commit**

```bash
git add components/admin/side-panel/notes-panel.tsx components/admin/side-panel/panel-body.tsx
git commit -m "feat: Ghi nhanh panel in the admin sidebar"
```

### Task 16: Kiểm bằng tay giai đoạn 2

1. Alt+3: con trỏ nằm sẵn trong "Ghi gì đó…". Gõ "Mua đồ Tết" bằng Telex: editor mở ra với đủ chữ, chấm vàng rồi chuyển xanh.
2. Nút quay lại: thẻ note có tiêu đề và 3 dòng xem trước. Ghim: note lên đầu. Kính lúp, gõ `tet`: tìm ra.
3. Xoá: toast có Undo; Undo trả note về.
4. Tạo note, xoá hết chữ, quay lại: note biến mất, không để lại note trống.
5. F5: các note còn nguyên. Mở panel bằng cách F5 khi panel Ghi nhanh đang mở: con trỏ không tự nhảy vào ô (chỉ mở bằng tay mới focus).
6. Gõ một dòng rồi đóng tab ngay: mở lại, dòng đó đã được lưu.
7. DevTools → Network → Offline, gõ vào một note: chấm đỏ và đúng một toast. Online lại, gõ tiếp: chấm xanh.
8. Đang gõ giữa một bài dài trong editor, bấm Alt+3, gõ một note rồi Esc: con trỏ quay về đúng chỗ đang gõ, trang không bị cuộn.
9. Đang ở ô gõ của Ghi nhanh, bấm Alt+1 để sang Calendar rồi Esc: panel đóng.
10. Hai tab `/admin`, cả hai mở Ghi nhanh. Sửa một note ở tab A, đợi chấm xanh, rồi chuyển sang tab B: note ở B đã có chữ mới.
11. Ở tab B bật Offline (DevTools → Network) rồi gõ vào note đó: chấm đỏ. Sang tab A sửa note đó, đợi chấm xanh. Về tab B, tắt Offline, bấm chấm đỏ: B hiện chữ của A, kèm toast "Note này vừa được sửa ở nơi khác".
12. (Tuỳ chọn) Chỉnh giờ máy nhanh 10 phút rồi gõ vào một note: chấm đỏ, toast nhắc chỉnh giờ. Chỉnh lại giờ, gõ tiếp: chấm xanh.

---

## Giai đoạn 3: Task

### Task 17: Ngày theo giờ máy

**Files:**
- Create: `lib/date-key.ts`
- Test: `lib/date-key.test.ts`

**Step 1: Viết test**

```ts
import { describe, expect, it } from "vitest";
import { addDaysToKey, fromDateKey, isDateKey, toDateKey } from "@/lib/date-key";

describe("date keys", () => {
  it("formats a date by the local calendar", () => {
    expect(toDateKey(new Date(2026, 8, 1, 23, 59))).toBe("2026-09-01");
  });

  it("reads a key back as local midnight", () => {
    const date = fromDateKey("2026-09-11");
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 8, 11, 0,
    ]);
  });

  it("adds days across a month end", () => {
    expect(addDaysToKey("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysToKey("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("accepts real days only", () => {
    expect(isDateKey("2026-09-11")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-9-11")).toBe(false);
    expect(isDateKey(20260911)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/date-key.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/date-key"`.

**Step 3: Viết code**

```ts
import { addDays, format } from "date-fns";

/**
 * A calendar day as `YYYY-MM-DD`, read in the browser's own time zone. Tasks
 * store their due date this way and the calendar groups by it, so "today" is
 * always the day on the admin's wall, never the server's (UTC on Vercel).
 */
export type DateKey = string;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date: Date): DateKey {
  return format(date, "yyyy-MM-dd");
}

/** Local midnight at the start of the day. */
export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Also rejects days that do not exist, like 2026-02-30. */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  return toDateKey(fromDateKey(value)) === value;
}

export function addDaysToKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), days));
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/date-key.test.ts`
Expected: PASS, 4 tests.

**Step 5: Commit**

```bash
git add lib/date-key.ts lib/date-key.test.ts
git commit -m "feat: local calendar days as YYYY-MM-DD keys"
```

### Task 18: Logic của task

**Files:**
- Create: `lib/admin-tasks.ts`
- Test: `lib/admin-tasks.test.ts`

**Step 1: Viết test**

```ts
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
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/admin-tasks.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/admin-tasks"`.

**Step 3: Viết code**

```ts
import { parseTimestamp } from "@/lib/admin-db";
import { addDaysToKey, fromDateKey, isDateKey, type DateKey } from "@/lib/date-key";

/** One row of admin_tasks. `due_on` is a day with no time; `done_at` null means open. */
export type AdminTask = {
  id: string;
  title: string;
  due_on: DateKey | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskGroups = {
  overdue: AdminTask[];
  today: AdminTask[];
  upcoming: AdminTask[];
  someday: AdminTask[];
  done: AdminTask[];
};

/** Finished tasks stay listed this long. Older ones remain in the table, unlisted. */
export const DONE_VISIBLE_DAYS = 7;

export const MAX_TASK_TITLE = 500;

const DAY_MS = 86_400_000;

export function doneCutoff(now: Date): Date {
  return new Date(now.getTime() - DONE_VISIBLE_DAYS * DAY_MS);
}

function byDueThenCreated(a: AdminTask, b: AdminTask): number {
  return (
    (a.due_on ?? "").localeCompare(b.due_on ?? "") ||
    Date.parse(a.created_at) - Date.parse(b.created_at)
  );
}

export function groupTasks(tasks: AdminTask[], today: DateKey, now: Date): TaskGroups {
  const groups: TaskGroups = { overdue: [], today: [], upcoming: [], someday: [], done: [] };
  const cutoff = doneCutoff(now).getTime();

  for (const task of tasks) {
    if (task.done_at) {
      if (Date.parse(task.done_at) >= cutoff) groups.done.push(task);
    } else if (!task.due_on) {
      groups.someday.push(task);
    } else if (task.due_on < today) {
      groups.overdue.push(task);
    } else if (task.due_on === today) {
      groups.today.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }

  groups.overdue.sort(byDueThenCreated);
  groups.today.sort(byDueThenCreated);
  groups.upcoming.sort(byDueThenCreated);
  groups.someday.sort(byDueThenCreated);
  groups.done.sort((a, b) => Date.parse(b.done_at ?? "") - Date.parse(a.done_at ?? ""));
  return groups;
}

/** The number on the rail: open tasks due today or already late. */
export function badgeCount(tasks: AdminTask[], today: DateKey): number {
  return tasks.filter((task) => !task.done_at && task.due_on !== null && task.due_on <= today)
    .length;
}

/** Tasks due that day, open or done, for the calendar agenda. */
export function tasksDueOn(tasks: AdminTask[], day: DateKey): AdminTask[] {
  return tasks.filter((task) => task.due_on === day).sort(byDueThenCreated);
}

/** Days with an open task, for the dots on the month grid. */
export function openTaskDays(tasks: AdminTask[]): Set<DateKey> {
  const days = new Set<DateKey>();
  for (const task of tasks) if (!task.done_at && task.due_on) days.add(task.due_on);
  return days;
}

export type QuickDue = "today" | "tomorrow" | "nextWeek";

/** "Tuần sau" means next Monday, as in Google Tasks. */
export function quickDueDate(kind: QuickDue, today: DateKey): DateKey {
  if (kind === "today") return today;
  if (kind === "tomorrow") return addDaysToKey(today, 1);
  const weekday = fromDateKey(today).getDay(); // 0 is Sunday
  return addDaysToKey(today, (8 - weekday) % 7 || 7);
}

/** "Hôm nay", "Ngày mai", "Hôm qua", otherwise "12/9", with the year if it is not this one. */
export function dueLabel(due: DateKey, today: DateKey): string {
  if (due === today) return "Hôm nay";
  if (due === addDaysToKey(today, 1)) return "Ngày mai";
  if (due === addDaysToKey(today, -1)) return "Hôm qua";
  const [year, month, day] = due.split("-").map(Number);
  return due.slice(0, 4) === today.slice(0, 4) ? `${day}/${month}` : `${day}/${month}/${year}`;
}

export type TaskInput = {
  title: string;
  due_on: DateKey | null;
  done_at: string | null;
  created_at?: string;
};

/** Checks a PUT body for /api/admin/tasks/[id]. */
export function parseTaskInput(
  value: unknown,
): { ok: true; input: TaskInput } | { ok: false; error: string } {
  const data = (value ?? {}) as Record<string, unknown>;

  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) return { ok: false, error: "Task cần có tiêu đề" };
  if (title.length > MAX_TASK_TITLE) {
    return { ok: false, error: `Tiêu đề dài quá ${MAX_TASK_TITLE} ký tự` };
  }

  const dueOn = data.due_on == null ? null : isDateKey(data.due_on) ? data.due_on : undefined;
  if (dueOn === undefined) return { ok: false, error: "due_on phải có dạng YYYY-MM-DD" };

  const doneAt = data.done_at == null ? null : parseTimestamp(data.done_at);
  if (data.done_at != null && !doneAt) return { ok: false, error: "done_at không đọc được" };

  const createdAt = parseTimestamp(data.created_at);
  return {
    ok: true,
    input: {
      title,
      due_on: dueOn,
      done_at: doneAt,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  };
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/admin-tasks.test.ts`
Expected: PASS, 20 tests.

**Step 5: Commit**

```bash
git add lib/admin-tasks.ts lib/admin-tasks.test.ts
git commit -m "feat: task groups, badge count and due labels"
```

### Task 19: API của task

**Files:**
- Create: `app/api/admin/tasks/route.ts`
- Create: `app/api/admin/tasks/[id]/route.ts`

**Step 1: Danh sách**

Giá trị trong `.or()` được bọc nháy kép vì timestamp có dấu `:` và `.`, là ký tự đặc biệt trong cú pháp lọc của PostgREST.

```ts
import { dbError, requireAdmin } from "@/lib/admin-api";
import { doneCutoff } from "@/lib/admin-tasks";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/tasks
// Open tasks, plus the ones finished recently enough that the panel still
// lists them. Older finished tasks stay in the table, unlisted.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const since = doneCutoff(new Date()).toISOString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_tasks")
    .select("id, title, due_on, done_at, created_at, updated_at")
    .or(`done_at.is.null,done_at.gte."${since}"`)
    .order("created_at", { ascending: true });

  if (error) return dbError(error, "admin tasks GET");
  return NextResponse.json({ tasks: data });
}
```

**Step 2: Tạo, thay và xoá một task**

```ts
import { isUuid } from "@/lib/admin-db";
import { badRequest, dbError, requireAdmin } from "@/lib/admin-api";
import { parseTaskInput } from "@/lib/admin-tasks";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT /api/admin/tasks/[id]
// Creates the task or replaces it, with the id the browser made, so adding,
// editing, ticking and Undo are all this one call.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const parsed = parseTaskInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_tasks")
    .upsert({ id, ...parsed.input, updated_at: new Date().toISOString() })
    .select("id, title, due_on, done_at, created_at, updated_at")
    .single();

  if (error) return dbError(error, "admin tasks PUT");
  return NextResponse.json({ task: data });
}

// DELETE /api/admin/tasks/[id]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admin_tasks").delete().eq("id", id);

  if (error) return dbError(error, "admin tasks DELETE");
  return NextResponse.json({ ok: true });
}
```

**Step 3: Kiểm**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

- `curl -i http://localhost:3000/api/admin/tasks`. Expected: `401`.
- Trong console khi đã đăng nhập: `await (await fetch("/api/admin/tasks")).json()`. Expected: `{ tasks: [] }`.

**Step 4: Commit**

```bash
git add app/api/admin/tasks/route.ts "app/api/admin/tasks/[id]/route.ts"
git commit -m "feat: API for the admin side panel's tasks"
```

### Task 20: Kho dữ liệu của task

**Files:**
- Create: `components/admin/side-panel/use-now.ts`
- Create: `components/admin/side-panel/use-tasks-store.ts`
- Modify: `components/admin/side-panel/side-panel-provider.tsx`

**Step 1: Giờ hiện tại, tự cập nhật**

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs`. Lets "today" roll over at
 * midnight and the calendar's now-line move without a reload.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
```

**Step 2: Kho task**

```ts
"use client";

import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";
import type { AdminTask } from "@/lib/admin-tasks";
import type { DateKey } from "@/lib/date-key";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { LoadStatus } from "./load-status";
import { reportAdminError } from "./report-admin-error";

export type TaskPatch = Partial<Pick<AdminTask, "title" | "due_on">>;

export type TasksStore = {
  status: LoadStatus;
  tasks: AdminTask[];
  reload: () => void;
  add: (title: string, dueOn: DateKey | null) => void;
  update: (task: AdminTask, patch: TaskPatch) => void;
  toggleDone: (task: AdminTask) => void;
  remove: (task: AdminTask) => void;
};

function putTask(task: AdminTask) {
  return adminFetch<{ task: AdminTask }>(`/api/admin/tasks/${task.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: task.title,
      due_on: task.due_on,
      done_at: task.done_at,
      created_at: task.created_at,
    }),
  });
}

const stamp = () => new Date().toISOString();

/**
 * The tasks behind the Task panel, the calendar agenda and the rail badge.
 * Every change shows at once and is saved in the background; a failed save
 * puts the task back as it was and says so.
 */
export function useTasksStore(enabled: boolean): TasksStore {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [tasks, setTasks] = useState<AdminTask[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await adminFetch<{ tasks: AdminTask[] }>("/api/admin/tasks");
      setTasks(data.tasks);
      setStatus("ready");
    } catch (error) {
      const missing = error instanceof AdminFetchError && error.kind === "missing_table";
      setStatus(missing ? "missing_table" : "error");
      if (!missing) reportAdminError(error, "Tải task");
    }
  }, []);

  // The first load, once enabled. Status stays "idle" until the answer is in,
  // so nothing sets state before the request goes out.
  const started = useRef(false);
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void fetchTasks();
  }, [enabled, fetchTasks]);

  /** Show `after` now and save it; if the save fails, show `before` again. */
  const replace = useCallback((before: AdminTask, after: AdminTask) => {
    setTasks((list) => list.map((task) => (task.id === after.id ? after : task)));
    putTask(after).catch((error) => {
      setTasks((list) => list.map((task) => (task.id === before.id ? before : task)));
      reportAdminError(error, "Lưu task");
    });
  }, []);

  const insert = useCallback((task: AdminTask) => {
    setTasks((list) => [...list.filter((t) => t.id !== task.id), task]);
    putTask(task).catch((error) => {
      setTasks((list) => list.filter((t) => t.id !== task.id));
      reportAdminError(error, "Lưu task");
    });
  }, []);

  const add = useCallback(
    (title: string, dueOn: DateKey | null) => {
      const now = stamp();
      insert({
        id: crypto.randomUUID(),
        title: title.trim(),
        due_on: dueOn,
        done_at: null,
        created_at: now,
        updated_at: now,
      });
    },
    [insert],
  );

  const update = useCallback(
    (task: AdminTask, patch: TaskPatch) => replace(task, { ...task, ...patch, updated_at: stamp() }),
    [replace],
  );

  const toggleDone = useCallback(
    (task: AdminTask) => {
      const after: AdminTask = { ...task, done_at: task.done_at ? null : stamp(), updated_at: stamp() };
      replace(task, after);
      if (after.done_at) {
        toast.success("Xong một việc", {
          action: { label: "Undo", onClick: () => replace(after, task) },
        });
      }
    },
    [replace],
  );

  const remove = useCallback(
    (task: AdminTask) => {
      setTasks((list) => list.filter((t) => t.id !== task.id));
      adminFetch(`/api/admin/tasks/${task.id}`, { method: "DELETE" }).then(
        () => toast.success("Đã xoá task", { action: { label: "Undo", onClick: () => insert(task) } }),
        (error) => {
          setTasks((list) => [...list, task]);
          reportAdminError(error, "Xoá task");
        },
      );
    },
    [insert],
  );

  const reload = useCallback(() => {
    setStatus("loading");
    void fetchTasks();
  }, [fetchTasks]);

  return useMemo(
    () => ({ status, tasks, reload, add, update, toggleDone, remove }),
    [status, tasks, reload, add, update, toggleDone, remove],
  );
}
```

**Step 3: Nối vào provider**

Thêm import:

```tsx
import { useTasksStore, type TasksStore } from "./use-tasks-store";
```

Thêm vào type `SidePanelContextValue`, trước `notes`:

```tsx
  tasks: TasksStore;
```

Thêm trước dòng `const notes = useNotesStore(...)`:

```tsx
  // Tasks load as soon as the owner is known: the rail badge needs them.
  const tasks = useTasksStore(admin);
```

Thêm `tasks` vào object trong `useMemo` và vào mảng deps.

**Step 4: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 5: Commit**

```bash
git add components/admin/side-panel/use-now.ts components/admin/side-panel/use-tasks-store.ts components/admin/side-panel/side-panel-provider.tsx
git commit -m "feat: task store for the side panel"
```

### Task 21: Panel Task

**Files:**
- Create: `components/admin/side-panel/due-picker.tsx`
- Create: `components/admin/side-panel/tasks-panel.tsx`
- Modify: `components/admin/side-panel/panel-body.tsx`

**Step 1: Chọn hạn**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dueLabel, quickDueDate, type QuickDue } from "@/lib/admin-tasks";
import { fromDateKey, toDateKey, type DateKey } from "@/lib/date-key";
import { cn } from "@/lib/utils";
import { CalendarClockIcon } from "lucide-react";
import { useState } from "react";

const QUICK: { kind: QuickDue; label: string }[] = [
  { kind: "today", label: "Hôm nay" },
  { kind: "tomorrow", label: "Ngày mai" },
  { kind: "nextWeek", label: "Tuần sau" },
];

/**
 * Picks a task's due day: three quick choices, a month grid, and "Bỏ hạn".
 * `compact` is the icon-only trigger used on a task row.
 */
export function DuePicker({
  value,
  today,
  onChange,
  compact = false,
}: {
  value: DateKey | null;
  today: DateKey;
  onChange: (due: DateKey | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const pick = (due: DateKey | null) => {
    onChange(due);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Đổi hạn"
            title="Đổi hạn"
          >
            <CalendarClockIcon className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-9 shrink-0 gap-1.5 px-2 text-xs", !value && "text-muted-foreground")}
          >
            <CalendarClockIcon className="h-3.5 w-3.5" />
            {value ? dueLabel(value, today) : "Hạn"}
          </Button>
        )}
      </PopoverTrigger>
      {/* Above the side panel (z-56) it opens from. */}
      <PopoverContent align="end" className="z-[70] w-auto p-0">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {QUICK.map(({ kind, label }) => (
            <Button
              key={kind}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => pick(quickDueDate(kind, today))}
            >
              {label}
            </Button>
          ))}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => pick(null)}
            >
              Bỏ hạn
            </Button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={value ? fromDateKey(value) : undefined}
          onSelect={(date) => {
            if (date) pick(toDateKey(date));
          }}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}
```

**Step 2: Panel**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { dueLabel, groupTasks, MAX_TASK_TITLE, type AdminTask } from "@/lib/admin-tasks";
import { toDateKey, type DateKey } from "@/lib/date-key";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DuePicker } from "./due-picker";
import { PanelNotice } from "./panel-notice";
import { useSidePanel } from "./side-panel-provider";
import { useNow } from "./use-now";

export function TasksPanel({ autoFocus }: { autoFocus: boolean }) {
  const { tasks } = useSidePanel();
  const now = useNow();
  const today = toDateKey(now);
  const groups = useMemo(() => groupTasks(tasks.tasks, today, now), [tasks.tasks, today, now]);
  const [showDone, setShowDone] = useState(false);

  if (tasks.status === "missing_table" || tasks.status === "error") {
    return <PanelNotice kind={tasks.status} onRetry={tasks.reload} />;
  }

  const openCount =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.someday.length;

  return (
    <div className="space-y-4 p-3">
      <NewTask today={today} autoFocus={autoFocus} disabled={tasks.status !== "ready"} />

      {(tasks.status === "idle" || tasks.status === "loading") && (
        <p className="py-6 text-center text-xs text-muted-foreground">Đang tải…</p>
      )}
      {tasks.status === "ready" && openCount === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Không còn việc nào.</p>
      )}

      <TaskGroup title="Quá hạn" danger tasks={groups.overdue} today={today} />
      <TaskGroup title="Hôm nay" tasks={groups.today} today={today} />
      <TaskGroup title="Sắp tới" tasks={groups.upcoming} today={today} />
      <TaskGroup title="Không hạn" tasks={groups.someday} today={today} />

      {groups.done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((shown) => !shown)}
            aria-expanded={showDone}
            className="flex items-center gap-1 px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRightIcon
              className={cn("h-3.5 w-3.5 transition-transform", showDone && "rotate-90")}
            />
            Đã xong ({groups.done.length})
          </button>
          {showDone && (
            <ul className="mt-1 space-y-0.5">
              {groups.done.map((task) => (
                <TaskRow key={task.id} task={task} today={today} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function NewTask({
  today,
  autoFocus,
  disabled,
}: {
  today: DateKey;
  autoFocus: boolean;
  disabled: boolean;
}) {
  const { tasks } = useSidePanel();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<DateKey | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Disabled until tasks have loaded, and a disabled input cannot take focus.
  useEffect(() => {
    if (autoFocus && !disabled) input.current?.focus();
  }, [autoFocus, disabled]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    tasks.add(title, due);
    setTitle("");
    setDue(null);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <Input
        ref={input}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Thêm task…"
        maxLength={MAX_TASK_TITLE}
        disabled={disabled}
        className="h-9"
      />
      <DuePicker value={due} today={today} onChange={setDue} />
    </form>
  );
}

function TaskGroup({
  title,
  danger = false,
  tasks,
  today,
}: {
  title: string;
  danger?: boolean;
  tasks: AdminTask[];
  today: DateKey;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h3
        className={cn(
          "mb-1 px-1 text-xs font-medium text-muted-foreground",
          danger && "text-destructive",
        )}
      >
        {title} <span className="tabular-nums">({tasks.length})</span>
      </h3>
      <ul className="space-y-0.5">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({ task, today }: { task: AdminTask; today: DateKey }) {
  const { tasks } = useSidePanel();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const done = task.done_at !== null;
  const overdue = !done && task.due_on !== null && task.due_on < today;

  const commit = () => {
    setEditing(false);
    const title = draft.trim();
    if (title && title !== task.title) tasks.update(task, { title });
    else setDraft(task.title);
  };

  return (
    <li className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50">
      <Checkbox
        checked={done}
        onCheckedChange={() => tasks.toggleDone(task)}
        aria-label={done ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            maxLength={MAX_TASK_TITLE}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                // Cancels the edit only; the panel stays open.
                event.stopPropagation();
                setDraft(task.title);
                setEditing(false);
              }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(task.title);
              setEditing(true);
            }}
            className={cn(
              "block w-full break-words text-left text-sm",
              done && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </button>
        )}
        {task.due_on && (
          <p className={cn("mt-0.5 text-xs text-muted-foreground", overdue && "text-destructive")}>
            {dueLabel(task.due_on, today)}
          </p>
        )}
      </div>
      {/* On hover from md up; always there on touch screens, which have no hover. */}
      <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <DuePicker
          compact
          value={task.due_on}
          today={today}
          onChange={(due_on) => tasks.update(task, { due_on })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Xoá task"
          onClick={() => tasks.remove(task)}
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
```

**Step 3: Nối vào panel body**

Trong `panel-body.tsx`, thêm import `import { TasksPanel } from "./tasks-panel";` và thêm dòng này ngay trên dòng `if (id === "notes")`:

```tsx
  if (id === "tasks") return <TasksPanel autoFocus={autoFocus} />;
```

**Step 4: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 5: Commit**

```bash
git add components/admin/side-panel/due-picker.tsx components/admin/side-panel/tasks-panel.tsx components/admin/side-panel/panel-body.tsx
git commit -m "feat: Task panel in the admin sidebar"
```

### Task 22: Badge trên rail

**Files:**
- Modify: `components/admin/side-panel/side-rail.tsx` (thay cả file)

**Step 1: Rail có badge**

```tsx
"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { badgeCount } from "@/lib/admin-tasks";
import { toDateKey } from "@/lib/date-key";
import { cn } from "@/lib/utils";
import { PANELS } from "./panels";
import { useSidePanel } from "./side-panel-provider";
import { useNow } from "./use-now";

export function SideRail() {
  const { panel, toggle, tasks } = useSidePanel();
  const today = toDateKey(useNow());
  const due = tasks.status === "ready" ? badgeCount(tasks.tasks, today) : 0;

  return (
    // display comes from app/admin/layout.tsx, not a class here: the rail is
    // hidden until html.is-admin and below 768px. z-57, one above the panel:
    // see the tooltip below.
    <nav
      aria-label="Lịch, task và ghi nhanh"
      className="admin-side-rail focus-mode-hidden fixed bottom-0 right-0 top-9 z-[57] w-12 flex-col items-center gap-1 border-l bg-background py-2"
    >
      {PANELS.map(({ id, label, shortcut, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-label={label}
              aria-pressed={panel === id}
              aria-keyshortcuts={shortcut}
              data-panel={id}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                panel === id && "bg-muted text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {id === "tasks" && due > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-medium leading-4 text-destructive-foreground tabular-nums">
                  {due > 9 ? "9+" : due}
                </span>
              )}
            </button>
          </TooltipTrigger>
          {/* components/ui/tooltip.tsx does not portal, so this paints inside
              the rail's stacking context. That is why the rail sits one above
              the panel (z-57 over z-56): otherwise an open panel covers it. */}
          <TooltipContent side="left" className="z-[70]">
            {label} <span className="ml-1 font-mono text-[10px] text-muted-foreground">{shortcut}</span>
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}
```

**Step 2: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 3: Commit**

```bash
git add components/admin/side-panel/side-rail.tsx
git commit -m "feat: count of due tasks on the side rail"
```

### Task 23: Kiểm bằng tay giai đoạn 3

1. Alt+2, gõ "Viết bài ical" rồi chọn hạn "Ngày mai", Enter: task nằm ở "Sắp tới", nhãn "Ngày mai".
2. Thêm task, chọn hôm qua trong lịch nhỏ: task nằm ở "Quá hạn", chữ đỏ; badge trên rail tăng lên 1.
3. Tick: toast "Xong một việc" có Undo; task sang "Đã xong"; badge giảm. Undo trả task về.
4. Bấm vào tiêu đề, sửa rồi Enter: lưu. Sửa rồi Esc: huỷ sửa, panel vẫn mở.
5. Mở popover chọn hạn rồi Esc: chỉ popover đóng, panel vẫn mở.
6. F5: task còn nguyên, badge đúng số ngay khi task tải xong.
7. 390px: trên mỗi dòng task, nút đổi hạn và nút xoá luôn hiện (màn cảm ứng không có hover).

---

## Giai đoạn 4: Calendar

### Task 24: Sự kiện theo ngày

**Files:**
- Create: `lib/calendar-events.ts`
- Test: `lib/calendar-events.test.ts`

File này không import `ical.js`, vì client cũng import nó.

**Step 1: Viết test**

Mọi thời điểm trong test được dựng từ giờ địa phương, nên test chạy đúng ở mọi múi giờ.

```ts
import { describe, expect, it } from "vitest";
import {
  dayLabel,
  daysWithEvents,
  eventsOn,
  eventTimeLabel,
  monthKeyOf,
  monthRange,
  occursOn,
  type CalendarEvent,
} from "@/lib/calendar-events";

// Instants are built from local dates so the tests read the same in any zone.
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 8, day, hour, minute).toISOString();

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: overrides.title ?? "e",
    calendar: "MIT",
    color: "#16a34a",
    title: "Sự kiện",
    location: null,
    description: null,
    allDay: false,
    start: at(11, 9),
    end: at(11, 10),
    ...overrides,
  };
}

describe("occursOn", () => {
  it("puts an event that crosses midnight on both days", () => {
    const match = event({ start: at(13, 22, 30), end: at(14, 0, 15) });
    expect(occursOn(match, "2026-09-12")).toBe(false);
    expect(occursOn(match, "2026-09-13")).toBe(true);
    expect(occursOn(match, "2026-09-14")).toBe(true);
    expect(occursOn(match, "2026-09-15")).toBe(false);
  });

  it("does not spill an event ending at midnight into the next day", () => {
    const evening = event({ start: at(13, 20), end: at(14, 0) });
    expect(occursOn(evening, "2026-09-14")).toBe(false);
  });

  it("treats an all-day end as exclusive", () => {
    const trip = event({ allDay: true, start: "2026-09-14", end: "2026-09-16" });
    expect(["2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16"].map((d) => occursOn(trip, d)))
      .toEqual([false, true, true, false]);
  });
});

describe("eventsOn", () => {
  it("lists all-day events first, then timed ones by start", () => {
    const events = [
      event({ title: "Chiều", start: at(11, 14), end: at(11, 15) }),
      event({ title: "Sáng", start: at(11, 9), end: at(11, 10) }),
      event({ title: "Lễ", allDay: true, start: "2026-09-11", end: "2026-09-12" }),
      event({ title: "Hôm khác", start: at(12, 9), end: at(12, 10) }),
    ];
    expect(eventsOn(events, "2026-09-11").map((e) => e.title)).toEqual(["Lễ", "Sáng", "Chiều"]);
  });
});

describe("daysWithEvents", () => {
  it("marks every day an event touches, inside the range only", () => {
    const events = [event({ allDay: true, start: "2026-09-14", end: "2026-09-16" })];
    expect([...daysWithEvents(events, "2026-09-15", "2026-09-20")]).toEqual(["2026-09-15"]);
  });
});

describe("monthRange / monthKeyOf", () => {
  it("covers the month and a week either side", () => {
    expect(monthRange("2026-09")).toEqual({ from: "2026-08-25", to: "2026-10-08" });
  });

  it("crosses into the next year", () => {
    expect(monthRange("2026-12")).toEqual({ from: "2026-11-24", to: "2027-01-08" });
  });

  it("names a day's month", () => {
    expect(monthKeyOf("2026-09-11")).toBe("2026-09");
  });
});

describe("labels", () => {
  it("formats times and all-day", () => {
    expect(eventTimeLabel(event({ start: at(11, 9), end: at(11, 17, 30) }))).toBe("09:00–17:30");
    expect(eventTimeLabel(event({ allDay: true, start: "2026-09-11", end: "2026-09-12" }))).toBe(
      "Cả ngày",
    );
  });

  it("names the day in Vietnamese", () => {
    expect(dayLabel("2026-09-11")).toBe("Thứ 6, 11/9");
    expect(dayLabel("2026-09-13")).toBe("Chủ nhật, 13/9");
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/calendar-events.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/calendar-events"`.

**Step 3: Viết code**

```ts
import { format } from "date-fns";
import { addDaysToKey, fromDateKey, toDateKey, type DateKey } from "@/lib/date-key";

/**
 * One occurrence of a Google Calendar event, as the calendar route hands it to
 * the browser. Recurring events arrive already expanded, one entry per
 * occurrence. No ical.js in here: this file is imported by the client.
 */
export type CalendarEvent = {
  id: string;
  calendar: string;
  color: string;
  title: string;
  location: string | null;
  description: string | null;
  allDay: boolean;
  /** All-day: the first day, `YYYY-MM-DD`. Timed: an ISO instant. */
  start: string;
  /** All-day: the day after the last one (exclusive). Timed: an ISO instant. */
  end: string;
};

export type CalendarPayload = {
  /** False when ADMIN_CALENDAR_FEEDS is missing or invalid; `error` says why. */
  configured: boolean;
  events: CalendarEvent[];
  /** Names of the calendars that could not be loaded this time. */
  failed: string[];
  error?: string;
};

/** Whether the event touches this local day at all. */
export function occursOn(event: CalendarEvent, day: DateKey): boolean {
  if (event.allDay) return event.start <= day && day < event.end;
  const dayStart = fromDateKey(day).getTime();
  const dayEnd = fromDateKey(addDaysToKey(day, 1)).getTime();
  return Date.parse(event.start) < dayEnd && Date.parse(event.end) > dayStart;
}

/** The day's agenda: all-day events first by title, then timed ones by start. */
export function eventsOn(events: CalendarEvent[], day: DateKey): CalendarEvent[] {
  return events
    .filter((event) => occursOn(event, day))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      const byStart = a.allDay ? 0 : Date.parse(a.start) - Date.parse(b.start);
      return byStart || a.title.localeCompare(b.title, "vi");
    });
}

/** Every local day in [from, to) with at least one event: the dots on the month grid. */
export function daysWithEvents(
  events: CalendarEvent[],
  from: DateKey,
  to: DateKey,
): Set<DateKey> {
  const days = new Set<DateKey>();
  for (let day = from; day < to; day = addDaysToKey(day, 1)) {
    if (events.some((event) => occursOn(event, day))) days.add(day);
  }
  return days;
}

/** "09:00–17:30", or "Cả ngày". */
export function eventTimeLabel(event: CalendarEvent): string {
  if (event.allDay) return "Cả ngày";
  const start = format(new Date(event.start), "HH:mm");
  const end = format(new Date(event.end), "HH:mm");
  return `${start}–${end}`;
}

/** "2026-09" for any day in September 2026. */
export function monthKeyOf(day: DateKey): string {
  return day.slice(0, 7);
}

/**
 * The days to load for a month: a week either side of it, which covers the
 * leading and trailing days the month grid borrows from its neighbours.
 */
export function monthRange(month: string): { from: DateKey; to: DateKey } {
  const first = fromDateKey(`${month}-01`);
  const nextFirst = toDateKey(new Date(first.getFullYear(), first.getMonth() + 1, 1));
  return { from: addDaysToKey(`${month}-01`, -7), to: addDaysToKey(nextFirst, 7) };
}

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

/** "Thứ 6, 11/9". */
export function dayLabel(day: DateKey): string {
  const date = fromDateKey(day);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}`;
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/calendar-events.test.ts`
Expected: PASS, 10 tests.

**Step 5: Commit**

```bash
git add lib/calendar-events.ts lib/calendar-events.test.ts
git commit -m "feat: calendar events by local day"
```

### Task 25: Đọc file ICS của Google

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `lib/calendar-feed.ts`
- Test: `lib/calendar-feed.test.ts`

**Step 1: Cài ical.js**

Run: `pnpm add ical.js@^2.2.1`
Expected: `package.json` có `"ical.js": "^2.2.1"` trong `dependencies`. Repo có `pnpm-workspace.yaml` (chỉ để chứa settings), nên nếu pnpm báo `ERR_PNPM_ADDING_TO_ROOT` thì chạy lại với `-w`.

**Step 2: Viết test**

File ICS mẫu có lịch `Europe/Moscow` (+03) để test thật sự kiểm được việc đăng ký múi giờ: trên máy ở +07, giờ Hồ Chí Minh chưa đăng ký tình cờ vẫn ra đúng. Đã thử: không đăng ký thì `12:00 Moscow` ra `05:00Z` trên máy +07 và `12:00Z` trên máy UTC, thay vì `09:00Z`.

```ts
import { describe, expect, it } from "vitest";
import { expandFeed, parseFeedsConfig } from "@/lib/calendar-feed";

// Shaped like Google's "Secret address in iCal format" export. Asia/Ho_Chi_Minh
// is the calendar's zone; Europe/Moscow (+03, no DST) is there so the zone
// registration is actually tested: on a machine at +07, an unregistered
// Ho Chi Minh time happens to come out right anyway.
const ICS = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "VERSION:2.0",
  "CALSCALE:GREGORIAN",
  "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Ho_Chi_Minh",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0700",
  "TZOFFSETTO:+0700",
  "TZNAME:GMT+7",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Moscow",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0300",
  "TZOFFSETTO:+0300",
  "TZNAME:MSK",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
  // Weekdays 09:00-17:30, Wednesday the 9th skipped, Thursday the 10th moved.
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260907T090000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260907T173000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  "EXDATE;TZID=Asia/Ho_Chi_Minh:20260909T090000",
  "UID:work@google.com",
  "SUMMARY:Working Hour",
  "LOCATION:107 Nguyễn Đình Chiểu",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "RECURRENCE-ID;TZID=Asia/Ho_Chi_Minh:20260910T090000",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260910T130000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260910T180000",
  "UID:work@google.com",
  "SUMMARY:Working Hour (dời)",
  "END:VEVENT",
  // Fridays from the 4th, ten times; the 30 Oct one pulled forward to 19 Sep.
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260904T080000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260904T090000",
  "RRULE:FREQ=WEEKLY;COUNT=10",
  "UID:standup@google.com",
  "SUMMARY:Standup",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "RECURRENCE-ID;TZID=Asia/Ho_Chi_Minh:20261030T080000",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260919T080000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260919T090000",
  "UID:standup@google.com",
  "SUMMARY:Standup (dời lên sớm)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260912",
  "DTEND;VALUE=DATE:20260913",
  "UID:birthday@google.com",
  "SUMMARY:Sinh nhật",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260914",
  "DTEND;VALUE=DATE:20260916",
  "UID:trip@google.com",
  "SUMMARY:Công tác",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20260913T153000Z",
  "DTEND:20260913T171500Z",
  "UID:match@google.com",
  "SUMMARY:Manchester United - Manchester City",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Moscow:20260911T120000",
  "DTEND;TZID=Europe/Moscow:20260911T130000",
  "UID:moscow@google.com",
  "SUMMARY:Call Moscow",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260911T190000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260911T200000",
  "UID:cancelled@google.com",
  "STATUS:CANCELLED",
  "SUMMARY:Đã huỷ",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261201T020000Z",
  "DTEND:20261201T030000Z",
  "UID:later@google.com",
  "SUMMARY:Ngoài khoảng",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const week = () => expandFeed(ICS, "2026-09-07", "2026-09-14");
const startsOf = (title: string, events = week()) =>
  events.filter((e) => e.title === title).map((e) => e.start);

describe("expandFeed", () => {
  it("expands a weekly series in its own time zone", () => {
    expect(startsOf("Working Hour")).toEqual(
      expect.arrayContaining([
        "2026-09-07T02:00:00.000Z",
        "2026-09-08T02:00:00.000Z",
        "2026-09-11T02:00:00.000Z",
      ]),
    );
  });

  it("drops a date listed in EXDATE", () => {
    expect(startsOf("Working Hour")).not.toContain("2026-09-09T02:00:00.000Z");
  });

  it("shows a moved instance at its new time, not its old slot", () => {
    expect(startsOf("Working Hour")).not.toContain("2026-09-10T02:00:00.000Z");
    expect(week().find((e) => e.title === "Working Hour (dời)")).toMatchObject({
      start: "2026-09-10T06:00:00.000Z",
      end: "2026-09-10T11:00:00.000Z",
      allDay: false,
    });
  });

  it("finds an instance moved into the range from a slot after it", () => {
    const events = expandFeed(ICS, "2026-09-14", "2026-09-21");
    expect(startsOf("Standup (dời lên sớm)", events)).toEqual(["2026-09-19T01:00:00.000Z"]);
  });

  it("honours a zone other than the machine's", () => {
    expect(startsOf("Call Moscow")).toEqual(["2026-09-11T09:00:00.000Z"]);
  });

  it("keeps all-day events as dates with an exclusive end", () => {
    expect(week().find((e) => e.title === "Sinh nhật")).toMatchObject({
      allDay: true,
      start: "2026-09-12",
      end: "2026-09-13",
    });
    expect(week().find((e) => e.title === "Công tác")).toMatchObject({
      start: "2026-09-14",
      end: "2026-09-16",
    });
  });

  it("keeps UTC times as they are", () => {
    expect(week().find((e) => e.title.startsWith("Manchester"))).toMatchObject({
      start: "2026-09-13T15:30:00.000Z",
      end: "2026-09-13T17:15:00.000Z",
    });
  });

  it("carries location and gives each occurrence its own id", () => {
    const work = week().filter((e) => e.title === "Working Hour");
    expect(work[0].location).toBe("107 Nguyễn Đình Chiểu");
    expect(new Set(work.map((e) => e.id)).size).toBe(work.length);
  });

  it("skips cancelled events and events outside the range", () => {
    const titles = week().map((e) => e.title);
    expect(titles).not.toContain("Đã huỷ");
    expect(titles).not.toContain("Ngoài khoảng");
  });
});

describe("parseFeedsConfig", () => {
  const url = "https://calendar.google.com/calendar/ical/secret/basic.ics";

  it("reads a valid list", () => {
    expect(parseFeedsConfig(JSON.stringify([{ name: "MIT", color: "#16a34a", url }]))).toEqual({
      ok: true,
      feeds: [{ name: "MIT", color: "#16a34a", url }],
    });
  });

  it("fills in a colour when none or a bad one is given", () => {
    const config = parseFeedsConfig(JSON.stringify([{ name: "MIT", url, color: "green" }]));
    expect(config.ok && config.feeds[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("turns webcal:// into https://", () => {
    const config = parseFeedsConfig(
      JSON.stringify([{ name: "Lễ", url: "webcal://example.com/holidays.ics" }]),
    );
    expect(config.ok && config.feeds[0].url).toBe("https://example.com/holidays.ics");
  });

  it.each([
    ["missing", undefined],
    ["blank", "  "],
    ["not JSON", "[{"],
    ["not an array", JSON.stringify({ name: "MIT", url })],
    ["an entry without url", JSON.stringify([{ name: "MIT" }])],
    ["plain http", JSON.stringify([{ name: "MIT", url: "http://example.com/a.ics" }])],
    ["two feeds with one name", JSON.stringify([{ name: "MIT", url }, { name: "MIT", url }])],
  ])("rejects %s", (_label, raw) => {
    expect(parseFeedsConfig(raw)).toMatchObject({ ok: false });
  });

  it("never puts the secret URL in an error", () => {
    const config = parseFeedsConfig(JSON.stringify([{ name: "MIT", url: "http://secret-token" }]));
    expect(config.ok).toBe(false);
    expect(!config.ok && config.error).not.toContain("secret-token");
  });
});
```

**Step 3: Chạy để thấy fail**

Run: `pnpm vitest run lib/calendar-feed.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/calendar-feed"`.

**Step 4: Viết code**

```ts
import ICAL from "ical.js";
import type { CalendarEvent } from "@/lib/calendar-events";
import { addDaysToKey, type DateKey } from "@/lib/date-key";

/**
 * Reads Google Calendar's iCal export on the server. Server only: the feed
 * URLs are secret (each one reads a whole calendar) and ical.js has no
 * business in the client bundle.
 */

export type CalendarFeed = { name: string; color: string; url: string };

export type FeedsConfig =
  | { ok: true; feeds: CalendarFeed[] }
  | { ok: false; error: string };

const FALLBACK_COLORS = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2"];

/**
 * `ADMIN_CALENDAR_FEEDS`: a JSON array of `{ name, url, color? }`. Errors name
 * the entry by position and never echo its URL, since the message can reach
 * the panel.
 */
export function parseFeedsConfig(raw: string | undefined): FeedsConfig {
  if (!raw?.trim()) return { ok: false, error: "ADMIN_CALENDAR_FEEDS chưa được đặt" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "ADMIN_CALENDAR_FEEDS không phải JSON hợp lệ" };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "ADMIN_CALENDAR_FEEDS phải là một mảng" };
  }

  const feeds: CalendarFeed[] = [];
  for (const [index, item] of parsed.entries()) {
    const entry = (item ?? {}) as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const rawUrl = typeof entry.url === "string" ? entry.url.trim() : "";
    if (!name || !rawUrl) {
      return { ok: false, error: `Lịch thứ ${index + 1} thiếu name hoặc url` };
    }
    // The route looks a feed up by name, so two with the same name would shadow.
    if (feeds.some((feed) => feed.name === name)) {
      return { ok: false, error: `Có hai lịch cùng tên "${name}"` };
    }
    // Apple, and Google in places, hand out webcal://, which is https underneath.
    const url = rawUrl.replace(/^webcal:\/\//i, "https://");
    if (!/^https:\/\//i.test(url)) {
      return { ok: false, error: `Lịch "${name}" phải dùng https` };
    }
    const color =
      typeof entry.color === "string" && /^#[0-9a-f]{6}$/i.test(entry.color)
        ? entry.color
        : FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    feeds.push({ name, color, url });
  }
  return { ok: true, feeds };
}

/** An occurrence before the route stamps it with its calendar's name and colour. */
export type FeedOccurrence = Omit<CalendarEvent, "calendar" | "color">;

// A daily series started years ago is a few thousand steps; this only stops a
// pathological rule (every minute, no end) from spinning.
const MAX_ITERATIONS = 50_000;
const MAX_DESCRIPTION = 2_000;

/**
 * Every occurrence in the feed that touches [from, to), recurring events
 * expanded, EXDATEs dropped and moved instances at their new time.
 *
 * The range is widened by a day each side because the server does not know
 * the viewer's time zone. The client trims to exact local days with
 * `occursOn`, so the extra day is only ever a little more data.
 */
export function expandFeed(ics: string, from: DateKey, to: DateKey): FeedOccurrence[] {
  const root = new ICAL.Component(ICAL.parse(ics));

  // A time written as TZID=Asia/Ho_Chi_Minh means nothing to ical.js until the
  // zone is registered. Unregistered, it is read as floating and lands in the
  // server's own zone: seven hours off on Vercel, where that is UTC.
  for (const vtimezone of root.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(vtimezone);
  }

  const lo = addDaysToKey(from, -1);
  const hi = addDaysToKey(to, 1);
  const loMs = utcMidnight(lo);
  const hiMs = utcMidnight(hi);

  const masters: ICAL.Component[] = [];
  const exceptionsByUid = new Map<string, ICAL.Component[]>();
  for (const vevent of root.getAllSubcomponents("vevent")) {
    if (!vevent.hasProperty("recurrence-id")) {
      masters.push(vevent);
      continue;
    }
    const uid = String(vevent.getFirstPropertyValue("uid") ?? "");
    exceptionsByUid.set(uid, [...(exceptionsByUid.get(uid) ?? []), vevent]);
  }

  const out: FeedOccurrence[] = [];
  const push = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
    if (item.component.getFirstPropertyValue("status") === "CANCELLED") return;
    const occurrence = toOccurrence(item, start, end);
    const inRange = occurrence.allDay
      ? occurrence.start < hi && occurrence.end > lo
      : Date.parse(occurrence.start) < hiMs && Date.parse(occurrence.end) > loMs;
    if (inRange) out.push(occurrence);
  };

  const seriesUids = new Set<string>();
  for (const vevent of masters) {
    const exceptions = exceptionsByUid.get(String(vevent.getFirstPropertyValue("uid") ?? "")) ?? [];
    const event = new ICAL.Event(vevent, { exceptions });
    seriesUids.add(event.uid);

    if (!event.isRecurring()) {
      push(event, event.startDate, event.endDate);
      continue;
    }

    const iterator = event.iterator();
    for (let i = 0, next = iterator.next(); next && i < MAX_ITERATIONS; i++, next = iterator.next()) {
      if (next.toJSDate().getTime() >= hiMs) break;
      const details = event.getOccurrenceDetails(next);
      push(details.item, details.startDate, details.endDate);
    }

    // An instance moved into the range from a slot after it is never reached
    // by the loop above, which stops at `hi`.
    for (const vexception of exceptions) {
      const exception = new ICAL.Event(vexception);
      if (exception.recurrenceId.toJSDate().getTime() >= hiMs) {
        push(exception, exception.startDate, exception.endDate);
      }
    }
  }

  // Moved instances whose series is not in this feed, as with some invitations.
  for (const [uid, exceptions] of exceptionsByUid) {
    if (seriesUids.has(uid)) continue;
    for (const vexception of exceptions) {
      const exception = new ICAL.Event(vexception);
      push(exception, exception.startDate, exception.endDate);
    }
  }

  return out;
}

function toOccurrence(item: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null): FeedOccurrence {
  const allDay = start.isDate;
  let startValue: string;
  let endValue: string;

  if (allDay) {
    startValue = dateKeyOf(start);
    endValue = end?.isDate ? dateKeyOf(end) : addDaysToKey(startValue, 1);
    // DTEND is exclusive; a feed that repeats DTSTART there still means one day.
    if (endValue <= startValue) endValue = addDaysToKey(startValue, 1);
  } else {
    const startMs = start.toJSDate().getTime();
    const endMs = end ? end.toJSDate().getTime() : startMs;
    startValue = new Date(startMs).toISOString();
    endValue = new Date(Math.max(startMs, endMs)).toISOString();
  }

  const description = item.description?.trim();
  return {
    id: `${item.uid}/${startValue}`,
    title: item.summary?.trim() || "(Không có tiêu đề)",
    location: item.location?.trim() || null,
    description: description ? description.slice(0, MAX_DESCRIPTION) : null,
    allDay,
    start: startValue,
    end: endValue,
  };
}

/** The date as written in the feed, with no time zone applied. */
function dateKeyOf(time: ICAL.Time): DateKey {
  const month = String(time.month).padStart(2, "0");
  const day = String(time.day).padStart(2, "0");
  return `${time.year}-${month}-${day}`;
}

function utcMidnight(key: DateKey): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
```

**Step 5: Chạy lại, ở cả múi giờ khác**

Run: `pnpm vitest run lib/calendar-feed.test.ts`
Expected: PASS, 20 tests.

Run (Git Bash): `TZ=UTC pnpm vitest run lib/calendar-feed.test.ts lib/calendar-events.test.ts`
Expected: PASS, 30 tests. Đây là múi giờ của Vercel.

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/calendar-feed.ts lib/calendar-feed.test.ts
git commit -m "feat: expand Google Calendar iCal feeds on the server"
```

### Task 26: Link tạo sự kiện bên Google

**Files:**
- Create: `lib/google-calendar-link.ts`
- Test: `lib/google-calendar-link.test.ts`

**Step 1: Viết test**

```ts
import { describe, expect, it } from "vitest";
import { newGoogleEventUrl } from "@/lib/google-calendar-link";

describe("newGoogleEventUrl", () => {
  it("opens Google's form on an all-day slot, end exclusive", () => {
    const url = new URL(newGoogleEventUrl("2026-09-30"));
    expect(`${url.origin}${url.pathname}`).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260930/20261001");
    expect(url.searchParams.has("text")).toBe(false);
  });

  it("fills in a title when there is one", () => {
    expect(new URL(newGoogleEventUrl("2026-09-11", "  Họp nhóm ")).searchParams.get("text")).toBe(
      "Họp nhóm",
    );
  });
});
```

**Step 2: Chạy để thấy fail**

Run: `pnpm vitest run lib/google-calendar-link.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/google-calendar-link"`.

**Step 3: Viết code**

```ts
import { addDaysToKey, type DateKey } from "@/lib/date-key";

/**
 * Google's own "new event" form, filled in with an all-day slot on `day`.
 * Creating the event over there keeps this side read-only: no OAuth, no
 * token, and the admin picks the calendar in Google's form.
 */
export function newGoogleEventUrl(day: DateKey, title?: string): string {
  const compact = (key: DateKey) => key.replace(/-/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    // All-day: the end is the day after, exclusive, as in iCalendar.
    dates: `${compact(day)}/${compact(addDaysToKey(day, 1))}`,
  });
  if (title?.trim()) params.set("text", title.trim());
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

**Step 4: Chạy lại**

Run: `pnpm vitest run lib/google-calendar-link.test.ts`
Expected: PASS, 2 tests.

**Step 5: Commit**

```bash
git add lib/google-calendar-link.ts lib/google-calendar-link.test.ts
git commit -m "feat: link to Google's own new-event form"
```

### Task 27: API lịch và cấu hình

**Files:**
- Create: `app/api/admin/calendar/route.ts`
- Modify: `.env.example`

**Step 1: Route**

`fresh=1` vừa bỏ qua cache cho câu trả lời này (gọi thẳng `fetchFeedRange`) vừa xoá cache (`revalidateTag(…, { expire: 0 })`), nên không phụ thuộc vào việc Next có thấy tag vừa bị xoá ngay trong cùng request hay không.

```ts
import { badRequest, requireAdmin } from "@/lib/admin-api";
import type { CalendarEvent, CalendarPayload } from "@/lib/calendar-events";
import { expandFeed, parseFeedsConfig, type FeedOccurrence } from "@/lib/calendar-feed";
import { addDaysToKey, isDateKey } from "@/lib/date-key";
import { revalidateTag, unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TAG = "admin-calendar";
const FETCH_TIMEOUT_MS = 8_000;
// A month grid asks for about 45 days; this only stops a runaway request.
const MAX_RANGE_DAYS = 62;

/**
 * One feed's occurrences in [from, to). Looked up by name so the secret URL
 * never becomes part of a cache key. Throws on failure, which keeps a failed
 * download out of the cache below.
 */
async function fetchFeedRange(name: string, from: string, to: string): Promise<FeedOccurrence[]> {
  const config = parseFeedsConfig(process.env.ADMIN_CALENDAR_FEEDS);
  const feed = config.ok ? config.feeds.find((f) => f.name === name) : undefined;
  if (!feed) throw new Error(`Không có lịch "${name}"`);

  const response = await fetch(feed.url, {
    // Next's fetch cache refuses anything over 2MB, and years of a work
    // calendar are easily more, so the expanded result is cached instead.
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return expandFeed(await response.text(), from, to);
}

const cachedFeedRange = unstable_cache(fetchFeedRange, ["admin-calendar-feed"], {
  revalidate: 300,
  tags: [CACHE_TAG],
});

// GET /api/admin/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD[&fresh=1]
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!isDateKey(from) || !isDateKey(to) || to <= from || addDaysToKey(from, MAX_RANGE_DAYS) < to) {
    return badRequest(`from và to phải là YYYY-MM-DD, from trước to, cách nhau tối đa ${MAX_RANGE_DAYS} ngày`);
  }

  const config = parseFeedsConfig(process.env.ADMIN_CALENDAR_FEEDS);
  if (!config.ok) {
    const payload: CalendarPayload = { configured: false, events: [], failed: [], error: config.error };
    return NextResponse.json(payload);
  }

  // ↻ in the panel: skip the cache for this answer and drop what it holds, so
  // an event just made in Google shows now rather than in five minutes.
  const fresh = searchParams.get("fresh") === "1";
  if (fresh) revalidateTag(CACHE_TAG, { expire: 0 });
  const load = fresh ? fetchFeedRange : cachedFeedRange;

  const results = await Promise.allSettled(config.feeds.map((feed) => load(feed.name, from, to)));

  const events: CalendarEvent[] = [];
  const failed: string[] = [];
  results.forEach((result, index) => {
    const feed = config.feeds[index];
    if (result.status === "rejected") {
      console.error(`[admin calendar] ${feed.name}:`, result.reason);
      failed.push(feed.name);
      return;
    }
    for (const occurrence of result.value) {
      events.push({ ...occurrence, calendar: feed.name, color: feed.color });
    }
  });

  const payload: CalendarPayload = { configured: true, events, failed };
  return NextResponse.json(payload);
}
```

**Step 2: `.env.example`**

Thêm vào cuối file:

```bash
# Server only. Google calendars for the Calendar panel in the admin sidebar,
# as one line of JSON: [{"name":"MIT","color":"#16a34a","url":"https://..."}].
# url is the calendar's "Secret address in iCal format" (Google Calendar >
# Settings > the calendar > Integrate calendar), or the public address for a
# public calendar. It reads the whole calendar: Reset it in Google if it leaks.
# color is optional. Empty means the panel shows tasks only.
ADMIN_CALENDAR_FEEDS=
```

**Step 3: Kiểm**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

- `curl -i "http://localhost:3000/api/admin/calendar?from=2026-09-01&to=2026-09-30"`. Expected: `401`.
- Trong console khi đã đăng nhập, chưa đặt biến môi trường: `await (await fetch("/api/admin/calendar?from=2026-09-01&to=2026-09-30")).json()`. Expected: `{ configured: false, events: [], failed: [], error: "ADMIN_CALENDAR_FEEDS chưa được đặt" }`.
- `from=2026-09-30&to=2026-09-01`. Expected: `400`.

**Step 4: Commit**

```bash
git add app/api/admin/calendar/route.ts .env.example
git commit -m "feat: calendar API reading Google iCal feeds, cached per month"
```

### Task 28: Kho dữ liệu của lịch

**Files:**
- Create: `components/admin/side-panel/use-calendar-store.ts`
- Modify: `components/admin/side-panel/side-panel-provider.tsx`

**Step 1: Kho lịch**

```ts
"use client";

import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";
import { monthRange, type CalendarPayload } from "@/lib/calendar-events";
import { useCallback, useMemo, useRef, useState } from "react";
import { reportAdminError } from "./report-admin-error";

export type CalendarMonth = {
  status: "loading" | "ready" | "error";
  /** Kept while a reload runs, so the agenda does not blank out. */
  payload: CalendarPayload | null;
};

export type CalendarStore = {
  /** By month, "YYYY-MM". */
  months: Record<string, CalendarMonth>;
  /** Loads the month unless it was loaded in the last five minutes. */
  ensure: (month: string) => void;
  /** Loads the month again, past the server's cache as well. */
  refresh: (month: string) => void;
};

const STALE_MS = 5 * 60_000;

/** Google Calendar events by month, kept while the admin layout stays mounted. */
export function useCalendarStore(): CalendarStore {
  const [months, setMonths] = useState<Record<string, CalendarMonth>>({});
  const loadedAt = useRef(new Map<string, number>());
  const inflight = useRef(new Set<string>());

  const load = useCallback(async (month: string, fresh: boolean) => {
    if (inflight.current.has(month)) return;
    inflight.current.add(month);
    setMonths((all) => ({
      ...all,
      [month]: { status: "loading", payload: all[month]?.payload ?? null },
    }));

    const { from, to } = monthRange(month);
    try {
      const payload = await adminFetch<CalendarPayload>(
        `/api/admin/calendar?from=${from}&to=${to}${fresh ? "&fresh=1" : ""}`,
      );
      loadedAt.current.set(month, Date.now());
      setMonths((all) => ({ ...all, [month]: { status: "ready", payload } }));
    } catch (error) {
      setMonths((all) => ({
        ...all,
        [month]: { status: "error", payload: all[month]?.payload ?? null },
      }));
      // Anything else is shown in the panel; a lapsed session needs the way back in.
      if (error instanceof AdminFetchError && error.kind === "auth") {
        reportAdminError(error, "Tải lịch");
      }
    } finally {
      inflight.current.delete(month);
    }
  }, []);

  const ensure = useCallback(
    (month: string) => {
      const at = loadedAt.current.get(month);
      if (at !== undefined && Date.now() - at < STALE_MS) return;
      void load(month, false);
    },
    [load],
  );

  const refresh = useCallback((month: string) => void load(month, true), [load]);

  return useMemo(() => ({ months, ensure, refresh }), [months, ensure, refresh]);
}
```

**Step 2: Nối vào provider**

Thêm import `useCalendarStore, type CalendarStore` từ `./use-calendar-store`, thêm `calendar: CalendarStore;` vào cuối type, thêm `const calendar = useCalendarStore();` sau dòng `const notes = …`, và thêm `calendar` vào object cùng deps của `useMemo`. Xong bước này, file phải giống hệt:

```tsx
"use client";

import { useIsAdmin } from "@/components/contexts/admin-context";
import {
  OPEN_ADMIN_SHEET_EVENT,
  readAdminPanel,
  shortcutPanel,
  subscribeAdminPanel,
  writeAdminPanel,
  type AdminPanelId,
} from "@/lib/admin-panel-prefs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { useCalendarStore, type CalendarStore } from "./use-calendar-store";
import { useNotesStore, type NotesStore } from "./use-notes-store";
import { useTasksStore, type TasksStore } from "./use-tasks-store";

type SidePanelContextValue = {
  /** The open panel, on screens with room for the rail; null when closed. */
  panel: AdminPanelId | null;
  /** True when the panel was opened by a click or a shortcut, not restored on load. */
  openedByUser: boolean;
  toggle: (id: AdminPanelId) => void;
  close: () => void;
  /** The bottom sheet that stands in for rail and panel under 768px. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  sheetTab: AdminPanelId;
  setSheetTab: (id: AdminPanelId) => void;
  tasks: TasksStore;
  notes: NotesStore;
  calendar: CalendarStore;
};

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export function useSidePanel(): SidePanelContextValue {
  const value = useContext(SidePanelContext);
  if (!value) throw new Error("useSidePanel needs SidePanelProvider");
  return value;
}

// Tailwind's max-md, the exact complement of md (min-width: 768px). A plain
// (max-width: 767px) leaves a gap at fractional widths such as 767.2px, which
// a 125% display scale produces, where neither the rail nor the sheet works.
const PHONE_QUERY = "not all and (min-width: 768px)";
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
const closedOnServer = () => null;

export function SidePanelProvider({ children }: PropsWithChildren) {
  const admin = useIsAdmin();
  // Seeded from the mark the head script put on <html> before first paint,
  // so the panel and the room made for it always agree.
  const panel = useSyncExternalStore(subscribeAdminPanel, readAdminPanel, closedOnServer);
  const [openedByUser, setOpenedByUser] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<AdminPanelId>("tasks");
  // Where focus goes back to when the panel closes: whatever had it when the
  // panel opened (the editor, mid-sentence, after Alt+3), else the rail.
  const returnFocus = useRef<HTMLElement | null>(null);

  const apply = useCallback((next: AdminPanelId | null) => {
    const previous = readAdminPanel();
    const focused = document.activeElement;
    const active = focused instanceof HTMLElement && focused !== document.body ? focused : null;
    const focusInPanel = active?.closest(".admin-side-panel") != null;
    // Remember what had focus before the panel took it, the first time there
    // is something to remember: on opening, or on the first switch after a
    // panel was restored on load. A switch made from inside the panel keeps
    // what was remembered.
    if (next && !focusInPanel && !returnFocus.current) returnFocus.current = active;

    setOpenedByUser(next !== null);
    writeAdminPanel(next);
    const root = document.documentElement;
    if (next) root.dataset.adminPanel = next;
    else delete root.dataset.adminPanel;

    // preventScroll throughout: a plain focus() on the editor can scroll the
    // page to its start before ProseMirror puts the caret back.
    if (next) {
      // A switch unmounts the content under the cursor. The close button
      // stays mounted across switches, so focus waits there: Calendar has no
      // field of its own, and Task and Ghi nhanh move it on to theirs.
      if (focusInPanel && next !== previous) {
        document.querySelector<HTMLElement>("[data-panel-close]")?.focus({ preventScroll: true });
      }
      return;
    }
    // Closing hides the panel under the cursor; hand focus back rather than
    // let it fall to <body>.
    if (focusInPanel) {
      const rail = document.querySelector<HTMLElement>(`.admin-side-rail [data-panel="${previous}"]`);
      const back = returnFocus.current?.isConnected ? returnFocus.current : rail;
      back?.focus({ preventScroll: true });
      // An opener hidden or disabled since then cannot take focus: use the rail.
      if (document.activeElement !== back) rail?.focus({ preventScroll: true });
    }
    returnFocus.current = null;
  }, []);

  const toggle = useCallback(
    (id: AdminPanelId) => apply(readAdminPanel() === id ? null : id),
    [apply],
  );
  const close = useCallback(() => apply(null), [apply]);

  // Alt+1/2/3 (shortcutPanel). On a phone they open the sheet instead. In
  // focus mode, which hides rail and panel, they do nothing.
  useEffect(() => {
    if (!admin) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const id = shortcutPanel(event);
      if (!id || document.body.classList.contains("focus-mode")) return;
      event.preventDefault();
      if (isPhone()) {
        setSheetTab(id);
        setSheetOpen(true);
      } else {
        toggle(id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [admin, toggle]);

  // The toolbar is in the root layout, outside this provider, so its phone
  // button reaches the sheet through an event. Only where the sheet can show:
  // opened at 768px or wider it would leave its overlay up over nothing.
  useEffect(() => {
    const open = () => {
      if (isPhone()) setSheetOpen(true);
    };
    window.addEventListener(OPEN_ADMIN_SHEET_EVENT, open);
    return () => window.removeEventListener(OPEN_ADMIN_SHEET_EVENT, open);
  }, []);

  // The sheet is hidden from 768px up; widening the window with it open would
  // leave its overlay behind with nothing on it.
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => {
      if (!query.matches) setSheetOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const notesShowing = panel === "notes" || (sheetOpen && sheetTab === "notes");
  // Tasks load as soon as the owner is known: the rail badge needs them.
  const tasks = useTasksStore(admin);
  const notes = useNotesStore(admin && notesShowing);
  const calendar = useCalendarStore();

  const value = useMemo(
    () => ({
      panel,
      openedByUser,
      toggle,
      close,
      sheetOpen,
      setSheetOpen,
      sheetTab,
      setSheetTab,
      tasks,
      notes,
      calendar,
    }),
    [panel, openedByUser, toggle, close, sheetOpen, sheetTab, tasks, notes, calendar],
  );

  return <SidePanelContext.Provider value={value}>{children}</SidePanelContext.Provider>;
}
```

**Step 3: Kiểm**

Run: `pnpm exec tsc --noEmit`
Expected: không lỗi.

**Step 4: Commit**

```bash
git add components/admin/side-panel/use-calendar-store.ts components/admin/side-panel/side-panel-provider.tsx
git commit -m "feat: calendar store for the side panel, cached by month"
```

### Task 29: Panel Calendar

**Files:**
- Create: `components/admin/side-panel/calendar-panel.tsx`
- Modify: `components/admin/side-panel/panel-body.tsx` (thay cả file)
- Modify: `app/admin/layout.tsx` (CSS chấm trên lịch tháng)

**Step 1: Panel**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { openTaskDays, tasksDueOn, type AdminTask } from "@/lib/admin-tasks";
import {
  dayLabel,
  daysWithEvents,
  eventsOn,
  eventTimeLabel,
  monthKeyOf,
  monthRange,
  type CalendarEvent,
} from "@/lib/calendar-events";
import { addDaysToKey, fromDateKey, toDateKey, type DateKey } from "@/lib/date-key";
import { newGoogleEventUrl } from "@/lib/google-calendar-link";
import { cn } from "@/lib/utils";
import {
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  RotateCwIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSidePanel } from "./side-panel-provider";
import { useNow } from "./use-now";

// Seven 2.5rem columns fill the 360px panel; the default 2rem leaves a gap.
const GRID_STYLE = { "--cell-size": "2.5rem" } as CSSProperties;

export function CalendarPanel() {
  const { calendar, tasks } = useSidePanel();
  const { ensure, refresh } = calendar;
  const now = useNow();
  const today = toDateKey(now);
  const [selected, setSelected] = useState<DateKey>(today);
  const [month, setMonth] = useState(() => monthKeyOf(today));
  const [expanded, setExpanded] = useState<string | null>(null);
  const selectedMonth = monthKeyOf(selected);

  // The grid's month for its dots, the selected day's month for the agenda.
  // Usually one and the same; paging the grid away splits them.
  useEffect(() => {
    ensure(month);
    ensure(selectedMonth);
  }, [ensure, month, selectedMonth]);

  const gridEvents = calendar.months[month]?.payload?.events;
  const dots = useMemo(() => {
    const { from, to } = monthRange(month);
    const days = daysWithEvents(gridEvents ?? [], from, to);
    for (const due of openTaskDays(tasks.tasks)) days.add(due);
    return [...days].map(fromDateKey);
  }, [gridEvents, month, tasks.tasks]);

  const day = calendar.months[selectedMonth];
  const payload = day?.payload ?? null;
  const loading = day?.status === "loading";
  const events = eventsOn(payload?.events ?? [], selected);
  const allDay = events.filter((event) => event.allDay);
  const timed = events.filter((event) => !event.allDay);
  const dueTasks = tasksDueOn(tasks.tasks, selected);
  // Where today's now-line goes: before the first event still to start, or after them all (-1).
  const nowAt =
    selected === today ? timed.findIndex((event) => Date.parse(event.start) > now.getTime()) : null;

  const select = (next: DateKey) => {
    setSelected(next);
    setMonth(monthKeyOf(next));
    setExpanded(null);
  };
  const toggle = (id: string) => setExpanded((open) => (open === id ? null : id));

  return (
    <div className="pb-4">
      <Calendar
        mode="single"
        required
        selected={fromDateKey(selected)}
        onSelect={(date: Date) => select(toDateKey(date))}
        month={fromDateKey(`${month}-01`)}
        onMonthChange={(date) => setMonth(monthKeyOf(toDateKey(date)))}
        weekStartsOn={1}
        modifiers={{ hasItems: dots }}
        modifiersClassNames={{ hasItems: "admin-cal-has-items" }}
        className="mx-auto"
        style={GRID_STYLE}
      />

      <div className="flex items-center gap-1 border-t px-3 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => select(today)}
        >
          Hôm nay
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Ngày trước"
          onClick={() => select(addDaysToKey(selected, -1))}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Ngày sau"
          onClick={() => select(addDaysToKey(selected, 1))}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <h3 className="ml-1 truncate text-sm font-medium">{dayLabel(selected)}</h3>
        <div className="ml-auto flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Tải lại lịch"
            title="Tải lại lịch"
            disabled={loading}
            onClick={() => refresh(selectedMonth)}
          >
            <RotateCwIcon className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
          {/* Created in Google's own form, which keeps this side read-only. */}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a
              href={newGoogleEventUrl(selected)}
              target="_blank"
              rel="noreferrer"
              aria-label="Thêm sự kiện trong Google Calendar"
              title="Thêm sự kiện trong Google Calendar"
            >
              <CalendarPlusIcon className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-1 px-3 pt-2">
        {payload && !payload.configured && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Chưa nối lịch Google: {payload.error}. Xem ADMIN_CALENDAR_FEEDS trong .env.example.
          </p>
        )}
        {payload && payload.failed.length > 0 && (
          <p className="text-xs text-destructive">Không tải được: {payload.failed.join(", ")}</p>
        )}
        {day?.status === "error" && (
          <p className="text-xs text-destructive">
            Không tải được lịch.{" "}
            <button type="button" className="underline" onClick={() => refresh(selectedMonth)}>
              Thử lại
            </button>
          </p>
        )}
        {!payload && loading && (
          <p className="py-4 text-center text-xs text-muted-foreground">Đang tải lịch…</p>
        )}
      </div>

      <ul className="space-y-0.5 px-1 pt-1">
        {allDay.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            open={expanded === event.id}
            onToggle={() => toggle(event.id)}
          />
        ))}
        {dueTasks.map((task) => (
          <AgendaTask key={task.id} task={task} />
        ))}
        {timed.map((event, index) => (
          <Fragment key={event.id}>
            {nowAt === index && <NowLine />}
            <EventRow event={event} open={expanded === event.id} onToggle={() => toggle(event.id)} />
          </Fragment>
        ))}
        {nowAt === -1 && timed.length > 0 && <NowLine />}
      </ul>

      {payload && events.length === 0 && dueTasks.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Không có gì trong ngày này.
        </p>
      )}
    </div>
  );
}

function EventRow({
  event,
  open,
  onToggle,
}: {
  event: CalendarEvent;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <span
          className="w-1 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: event.color }}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-medium", !open && "truncate")}>{event.title}</span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {eventTimeLabel(event)} · {event.calendar}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPinIcon className="h-3 w-3 shrink-0" />
              <span className={cn(!open && "truncate")}>{event.location}</span>
            </span>
          )}
          {open && event.description && (
            <span className="mt-1 block whitespace-pre-line break-words text-xs">
              {event.description}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function AgendaTask({ task }: { task: AdminTask }) {
  const { tasks } = useSidePanel();
  const done = task.done_at !== null;

  return (
    <li className="flex items-center gap-2 px-2 py-1.5">
      <Checkbox
        checked={done}
        onCheckedChange={() => tasks.toggleDone(task)}
        aria-label={done ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          done && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        task
      </span>
    </li>
  );
}

function NowLine() {
  return (
    <li aria-hidden className="flex items-center gap-1 px-2 py-0.5">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      <span className="h-px flex-1 bg-red-500" />
    </li>
  );
}
```

**Step 2: Panel body, bản cuối**

```tsx
"use client";

import type { AdminPanelId } from "@/lib/admin-panel-prefs";
import { CalendarPanel } from "./calendar-panel";
import { NotesPanel } from "./notes-panel";
import { TasksPanel } from "./tasks-panel";

/** `autoFocus`: put the cursor in the panel's input. Not when restored on page load. */
export function PanelBody({ id, autoFocus = false }: { id: AdminPanelId; autoFocus?: boolean }) {
  if (id === "calendar") return <CalendarPanel />;
  if (id === "tasks") return <TasksPanel autoFocus={autoFocus} />;
  return <NotesPanel autoFocus={autoFocus} />;
}
```

**Step 3: Chấm dưới ngày có việc**

Trong chuỗi CSS của `app/admin/layout.tsx`, thêm ngay sau dòng `body.focus-mode { --admin-side-w: 0px; }`:

```css

          /* The calendar panel's month grid: a dot under each day with something on it. */
          .admin-cal-has-items button::after {
            content: "";
            position: absolute;
            bottom: 4px;
            left: 50%;
            width: 4px;
            height: 4px;
            margin-left: -2px;
            border-radius: 9999px;
            background: currentColor;
            opacity: 0.6;
          }
```

**Step 4: Kiểm**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 5: Commit**

```bash
git add components/admin/side-panel/calendar-panel.tsx components/admin/side-panel/panel-body.tsx app/admin/layout.tsx
git commit -m "feat: Calendar panel with Google events and tasks by day"
```

### Task 30: Cấu hình lịch và kiểm bằng tay giai đoạn 4

**Step 1: Người dùng lấy link lịch (dừng lại và nhờ người dùng)**

Với từng lịch muốn thấy: Google Calendar → Settings → bấm tên lịch → Integrate calendar → copy "Secret address in iCal format". Nếu không có dòng đó (Workspace `mozox.com` có thể đã bị admin tắt), lịch đó không đọc được theo cách này; bỏ qua nó.

Đặt vào `.env.local`, **không phải `.env`**: `.env` đang được git track, còn `.env.local` bị `.gitignore` bỏ qua (`.env*.local`). Link bí mật mà vào commit là ai đọc được repo cũng đọc được lịch. Trên một dòng:

```bash
ADMIN_CALENDAR_FEEDS=[{"name":"Công việc","color":"#6b7280","url":"https://calendar.google.com/calendar/ical/.../basic.ics"},{"name":"MIT","color":"#16a34a","url":"https://calendar.google.com/calendar/ical/.../basic.ics"}]
```

Khởi động lại `pnpm dev`.

**Step 2: Kiểm**

1. Chưa đặt biến: panel ghi "Chưa nối lịch Google…" và vẫn hiện task của ngày.
2. Đã đặt biến: Alt+1, tuần này có lịch làm việc các ngày thường và lịch học, đúng giờ như trên Google (GMT+7). Hôm nay có vạch đỏ ở giờ hiện tại.
3. Ngày có sự kiện hoặc task có chấm dưới số ngày. Chuyển tháng: chấm của tháng mới hiện ra sau khi tải.
4. Bấm vào sự kiện: mở rộng, thấy mô tả.
5. Nút lịch có dấu cộng: form tạo sự kiện của Google mở trong tab mới, đúng ngày đang chọn. Tạo sự kiện, quay lại, bấm ↻: sự kiện hiện ra.
6. Làm hỏng url của một lịch trong `.env.local`, khởi động lại: dòng "Không tải được: <tên>", các lịch khác vẫn hiện.
8. `git status`: `.env.local` không xuất hiện.
7. Sự kiện kéo qua nửa đêm (ví dụ trận 22:30 tới 00:15) hiện ở cả hai ngày.

**Step 3: Vercel**

Người dùng thêm `ADMIN_CALENDAR_FEEDS` vào Project Settings → Environment Variables (Production), rồi redeploy. Không commit giá trị thật.

### Task 31: Kiểm toàn bộ và kết thúc

**Step 1: Test**

Run: `pnpm test`
Expected: mọi file test đều PASS, gồm 146 test mới.

**Step 2: Kiểu và lint**

Run: `pnpm exec tsc --noEmit` rồi `pnpm lint`
Expected: không lỗi kiểu; lint vẫn 0 error, 36 warning như trên master.

**Step 3: Build**

Run: `pnpm build`
Expected: build xong, trong danh sách route có `ƒ /api/admin/calendar`, `ƒ /api/admin/notes`, `ƒ /api/admin/notes/[id]`, `ƒ /api/admin/tasks`, `ƒ /api/admin/tasks/[id]`.

**Step 4: Kết thúc nhánh**

Dùng @superpowers:finishing-a-development-branch.
