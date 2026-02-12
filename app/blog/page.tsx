import { getAllBlogs } from "@/lib/markdown";
import { stringToDate } from "@/lib/utils";
import { Metadata } from "next";
import { BlogCard } from "./components/blog-card";

export const metadata: Metadata = {
  title: "blog",
};

// Enable static generation
export const dynamic = "force-static";
export const revalidate = false; // Never revalidate (pure static)

/**
 * PURE STATIC VERSION
 *
 * Benefits:
 * - Instant loading (pre-rendered at build time)
 * - No database wake-up delays
 * - Perfect for portfolio blogs
 * - SEO optimized
 *
 * To use:
 * 1. Rename this file to page.tsx (replace current one)
 * 2. Remove Supabase queries
 * 3. Only use MDX files for blog content
 */
export default async function BlogIndexPage() {
  // Get MDX blogs only
  const mdxBlogs = await getAllBlogs();

  // Sort by date (newest first)
  const allBlogs = mdxBlogs.sort(
    (a, b) => stringToDate(b.date).getTime() - stringToDate(a.date).getTime()
  );

  const [featuredBlog, ...restBlogs] = allBlogs;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-1 sm:min-h-[78vh] min-h-[76vh] pt-2 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold">my latest blogs</h1>
      </div>

      {/* Featured Post */}
      {featuredBlog && (
        <BlogCard
          key={featuredBlog.slug}
          title={featuredBlog.title}
          description={featuredBlog.description}
          date={featuredBlog.date}
          slug={featuredBlog.slug}
          isPublished={featuredBlog.isPublished}
          isFeatured
        />
      )}

      {/* Rest of Posts */}
      <div className="flex flex-col">
        {restBlogs.map((blog) => (
          <BlogCard
            key={blog.slug}
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
