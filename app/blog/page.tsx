import { getAllBlogs } from "@/lib/markdown";
import { stringToDate } from "@/lib/utils";
import { Metadata } from "next";
import { BlogCard } from "./components/blog-card";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "blog",
};

export const dynamic = "force-dynamic";

type UnifiedBlog = {
  slug: string;
  title: string;
  description: string;
  date: string;
  isPublished: boolean;
  source: "mdx" | "db";
};

export default async function BlogIndexPage() {
  // Get MDX blogs
  const mdxBlogs = (await getAllBlogs()).map((blog) => ({
    slug: blog.slug,
    title: blog.title,
    description: blog.description,
    date: blog.date,
    isPublished: blog.isPublished,
    source: "mdx" as const,
  }));

  // Get database posts
  const supabase = await createSupabaseServerClient();
  const { data: dbPosts, error } = await supabase
    .from("blogs")
    .select("slug, title, description, created_at, is_published")
    .eq("is_published", true);

  // Log error for debugging (will show in server logs)
  if (error) {
    console.error("Supabase query error:", error.message);
    console.error(
      "If you see a 406 error, the 'blogs' table might not exist. Run schema.sql in Supabase Dashboard."
    );
  }

  const dbBlogs: UnifiedBlog[] = (dbPosts || []).map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description || "",
    date: post.created_at,
    isPublished: post.is_published,
    source: "db" as const,
  }));

  // Merge and sort by date (newest first)
  const allBlogs = [...mdxBlogs, ...dbBlogs].sort(
    (a, b) => stringToDate(b.date).getTime() - stringToDate(a.date).getTime()
  );

  return (
    <div className="w-full mx-auto flex flex-col gap-1 sm:min-h-[78vh] min-h-[76vh] pt-2">
      <div className="mb-7 flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-center">my latest blogs</h1>
      </div>
      <div className="flex flex-col items-center mb-5">
        {allBlogs.map((blog) => (
          <BlogCard
            key={`${blog.source}-${blog.slug}`}
            title={blog.title}
            description={blog.description}
            date={blog.date}
            slug={blog.slug}
            isPublished={blog.isPublished}
          />
        ))}
      </div>
    </div>
  );
}
