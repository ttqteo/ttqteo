import { Button } from "@/components/ui/button";
import { getAllBlogs } from "@/lib/markdown";
import {
  createSupabaseServerClient,
  getUser,
  isAdmin,
} from "@/lib/supabase-server";
import { stringToDate } from "@/lib/utils";
import { FileTextIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { LoginButton } from "./login-button";
import { AdminPostActions } from "./post-actions";
import { AdminTabs } from "./admin-tabs";

export const dynamic = "force-dynamic";

type UnifiedPost = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  updated_at: string;
  source: "mdx" | "db";
  deleted_at?: string | null;
};

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const user = await getUser();
  const { view } = await searchParams;
  const isTrash = view === "trash";

  // Not authenticated - show login
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to manage your blog posts
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Not admin - show unauthorized
  const admin = await isAdmin();
  if (!admin) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold">Unauthorized</h1>
          <p className="text-muted-foreground mt-2">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Get database posts
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("blogs")
    .select("id, slug, title, is_published, created_at, updated_at, deleted_at")
    .order("updated_at", { ascending: false });

  if (isTrash) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  const { data: dbPosts } = await query;

  const dbItems: UnifiedPost[] = (dbPosts || []).map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title || "Untitled",
    is_published: post.is_published,
    updated_at: post.updated_at || post.created_at || new Date().toISOString(),
    deleted_at: post.deleted_at,
    source: "db" as const,
  }));

  // Get MDX blogs (only for active view, MDX doesn't have trash)
  let mdxItems: UnifiedPost[] = [];
  if (!isTrash) {
    const mdxBlogs = await getAllBlogs();
    mdxItems = mdxBlogs.map((blog) => ({
      id: `mdx-${blog.slug}`,
      slug: blog.slug,
      title: blog.title,
      is_published: blog.isPublished,
      updated_at: stringToDate(blog.date).toISOString(),
      source: "mdx" as const,
    }));
  }

  // Merge and sort by date
  const allPosts = [...dbItems, ...mdxItems].sort(
    (a, b) =>
      stringToDate(b.updated_at).getTime() -
      stringToDate(a.updated_at).getTime()
  );

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">admin dashboard</h1>
          <AdminTabs isTrash={isTrash} />
        </div>
        <div className="flex gap-2">
          {!isTrash && (
            <Button asChild>
              <Link href="/admin/edit/new">
                <PlusIcon className="w-4 h-4 mr-2" />
                New Blog
              </Link>
            </Button>
          )}
        </div>
      </div>

      {allPosts.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {isTrash
            ? "Trash is empty."
            : "No blogs yet. Create your first post!"}
        </p>
      ) : (
        <div className="space-y-2">
          {allPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{post.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      post.is_published
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}
                  >
                    {post.is_published ? "Published" : "Draft"}
                  </span>
                  {post.source === "mdx" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      MDX
                    </span>
                  )}
                  {post.deleted_at && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      Deleted
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  /{post.slug} •{" "}
                  {post.updated_at
                    ? new Date(post.updated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "No date"}
                </p>
              </div>
              <div className="flex gap-2">
                {post.source === "db" ? (
                  <>
                    {!isTrash && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/edit/${post.id}`}>
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                    <AdminPostActions
                      id={post.id}
                      title={post.title}
                      isDeleted={!!post.deleted_at}
                    />
                  </>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/blog/${post.slug}`} target="_blank">
                      <FileTextIcon className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
