import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  getUser: async () => null,
  isAdmin: async () => false,
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect }));
// Nút thật dựng Supabase client của trình duyệt; ở đây chỉ cần biết nó có mặt.
vi.mock("@/app/admin/login-button", () => ({
  LoginButton: () => <button type="button">Continue with Google</button>,
}));
vi.mock("@/app/admin/posts-data", () => ({ loadAdminPosts: vi.fn() }));
vi.mock("@/app/admin/posts-browser", () => ({ PostsBrowser: () => null }));
vi.mock("@/app/admin/edit/[id]/edit-post-client", () => ({ default: () => null }));

import AdminPage from "@/app/admin/page";
import EditPostPage from "@/app/admin/edit/[id]/page";

describe("chưa đăng nhập", () => {
  it("/admin hiện nút đăng nhập, và báo lỗi khi callback trả về ?login=failed", async () => {
    render(await AdminPage({ searchParams: Promise.resolve({ login: "failed" }) }));
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Đăng nhập không thành công");
  });

  it("/admin mở bình thường thì không báo lỗi gì", async () => {
    render(await AdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mở một bài trong editor thì về /admin để đăng nhập, không phải /login đã bỏ", async () => {
    await expect(
      EditPostPage({
        params: Promise.resolve({ id: "1" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT /admin");
    expect(redirect).toHaveBeenCalledWith("/admin");
  });
});
