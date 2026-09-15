import { editorTitle } from "@/lib/editor-title";
import {
  createSupabaseServerClient,
  getUser,
  isAdmin,
} from "@/lib/supabase-server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import EditPostClient from "./edit-post-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
};

// Một lần đọc cho cả generateMetadata lẫn trang: `cache` gộp hai lời gọi trong
// cùng một request.
const loadPost = cache(async (id: string) => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("blogs").select("*").eq("id", id).single();
  return data;
});

/**
 * Tiêu đề tab đặt từ metadata của route. Next áp metadata của route mỗi khi vào
 * trang, và trước đây đó là "ttqteo" của layout, nên tiêu đề mà editor đặt bằng
 * `document.title` có lúc bị đè mất.
 */
export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const post = id === "new" ? null : await loadPost(id);
  return { title: { absolute: editorTitle(post?.title ?? "") } };
}

export default async function EditPostPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { type } = await searchParams;

  const user = await getUser();
  // /admin là nơi có nút đăng nhập. /login cũ đã bỏ nên từng dẫn tới 404.
  if (!user) redirect("/admin");

  const admin = await isAdmin();
  if (!admin) redirect("/");

  // New post
  if (id === "new") {
    return <EditPostClient isNew={true} initialType={type} />;
  }

  // Existing post
  const post = await loadPost(id);

  if (!post) {
    redirect("/admin");
  }

  return (
    <EditPostClient
      isNew={false}
      initialData={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description || "",
        content: post.content || "",
        is_published: post.is_published,
        type: post.type || "article",
        tags: post.tags || "",
        guide_section: post.guide_section ?? null,
        guide_order: post.guide_order != null ? Number(post.guide_order) : null,
      }}
    />
  );
}
