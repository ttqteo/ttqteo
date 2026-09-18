import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  getUser: async () => ({ id: "u1" }),
  isAdmin: async () => true,
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("mermaid", () => ({ default: { initialize: vi.fn(), render: vi.fn() } }));
// The board reads the quick notes from the side panel's store, which lives in
// the admin layout; this page renders on its own here, with no quick notes.
vi.mock("@/components/admin/side-panel/side-panel-provider", () => ({
  useSidePanel: () => ({
    notes: {
      status: "ready",
      notes: [],
      saveState: {},
      reload: vi.fn(),
      create: vi.fn(),
      edit: vi.fn(),
      togglePin: vi.fn(),
      remove: vi.fn(),
      flush: vi.fn(),
      discardIfBlank: vi.fn(),
    },
  }),
}));
vi.mock("@/lib/posts", () => ({
  getPostsWithPrivateNotes: async () => [
    {
      id: "p1",
      title: "untitled",
      isPublished: false,
      updatedAt: "2026-09-15T00:00:00Z",
      notes: [
        '<p>đúng không nhỉ?</p><pre><code class="language-java">@SpringBootApplication\npublic class SsoApplication {}</code></pre>',
      ],
    },
  ],
}));

import AdminNotesPage from "@/app/admin/notes/page";

describe("trang Ghi chú, thẻ ghi chú trong bài", () => {
  it("khối code trong ghi chú có thanh ngôn ngữ, nút copy và số dòng như trên trang đọc", async () => {
    const { container } = render(await AdminNotesPage());
    const note = container.querySelector(".private-note")!;
    expect(note.querySelector(".code-shell-lang")?.textContent).toBe("java");
    expect(note.querySelector(".code-shell-copy")).not.toBeNull();
    expect(
      Array.from(note.querySelectorAll(".code-gutter > span"), (n) => n.textContent),
    ).toEqual(["1", "2"]);
    // Chữ của ghi chú vẫn còn nguyên quanh khối code.
    expect(note.textContent).toContain("đúng không nhỉ?");
  });

  it("nội dung ghi chú vẫn nằm trong khung ghi chú, cùng một div", async () => {
    const { container } = render(await AdminNotesPage());
    const body = container.querySelector(".private-note-body")!;
    // Không lồng thêm một lớp div: CSS cắt margin của khối đầu và cuối qua
    // `.private-note-body > :last-child`.
    expect(body.firstElementChild?.tagName).toBe("P");
  });
});
