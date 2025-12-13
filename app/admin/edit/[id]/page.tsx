import {
  createSupabaseServerClient,
  getUser,
  isAdmin,
} from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EditPostClient from "./edit-post-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const admin = await isAdmin();
  if (!admin) redirect("/");

  // New post
  if (id === "new") {
    return <EditPostClient isNew={true} />;
  }

  // Existing post
  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("blogs")
    .select("*")
    .eq("id", id)
    .single();

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
        content: post.content ? JSON.stringify(post.content) : "",
        is_published: post.is_published,
      }}
    />
  );
}
