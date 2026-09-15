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
import EditPostPage, { generateMetadata } from "@/app/admin/edit/[id]/page";
import { createSupabaseServerClient } from "@/lib/supabase-server";

describe("tiêu đề tab của trang soạn", () => {
  it("bài có sẵn: lấy tiêu đề đã lưu", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { title: "Java là gì" } }) }),
        }),
      }),
    } as never);
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toEqual({ absolute: "edit • Java là gì" });
  });

  it("bài mới: New Post, không đọc database", async () => {
    vi.mocked(createSupabaseServerClient).mockClear();
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "new" }) });
    expect(metadata.title).toEqual({ absolute: "edit • New Post" });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});

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
