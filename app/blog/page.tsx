import { getAllBlogs } from "@/lib/markdown";
import { stringToDate } from "@/lib/utils";
import { Metadata } from "next";
import { BlogCard } from "./components/blog-card";

export const metadata: Metadata = {
  title: "blog",
};

export default async function BlogIndexPage() {
  const blogs = (await getAllBlogs()).sort(
    (a, b) => stringToDate(b.date).getTime() - stringToDate(a.date).getTime()
  );
  return (
    <div className="w-full mx-auto flex flex-col gap-1 sm:min-h-[78vh] min-h-[76vh] pt-2">
      <div className="mb-7 flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-center">my latest blogs</h1>
        {/* <p className="text-muted-foreground">follow to read more</p> */}
        <></>
      </div>
      <div className="flex flex-col items-center mb-5">
        {blogs.map((blog) => (
          <BlogCard {...blog} slug={blog.slug} key={blog.slug} />
        ))}
      </div>
    </div>
  );
}
