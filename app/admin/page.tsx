import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAllPosts, getSupabasePosts, type UnifiedPost } from "@/lib/posts";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { FileTextIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { LoginButton } from "./login-button";
import { SyncMdxButton } from "./sync-mdx-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="max-w-[720px] mx-auto px-4">
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <h1 className="font-serif text-4xl">ttqteo</h1>
            <p className="font-mono text-xs text-muted-foreground mt-3 tracking-widest uppercase">
              private area
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    );
  }

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

  const [active, trash] = await Promise.all([
    getAllPosts({ view: "active" }),
    getSupabasePosts("trash"),
  ]);

  const drafts = active.filter((p) => !p.isPublished);
  const published = active.filter((p) => p.isPublished);
  const dbCount = active.filter((p) => p.source === "supabase").length;
  const mdxCount = active.filter((p) => p.source === "mdx").length;

  const typeCount = (t: string) => active.filter((p) => p.type === t).length;
  const counts = {
    post: typeCount("post"),
    note: typeCount("note"),
    reading: typeCount("reading"),
    paper: typeCount("paper"),
  };

  const continueWriting = [...drafts]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 6);
  const recentPublishes = [...published]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">admin dashboard</h1>
        <div className="flex items-center gap-2">
          <SyncMdxButton />
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/admin/edit/new?type=post">Post</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/edit/new?type=note">Note</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/edit/new?type=reading">Reading</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/edit/new?type=paper">Paper</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={active.length} sub={`${dbCount} supabase • ${mdxCount} mdx`} href="/admin/posts" />
        <StatCard label="Published" value={published.length} href="/admin/posts" />
        <StatCard label="Drafts" value={drafts.length} href="/admin/posts" />
        <StatCard
          label="Trash"
          value={trash.length}
          href="/admin/posts?view=trash"
          icon={<Trash2Icon className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>posts <span className="text-foreground font-medium">{counts.post}</span></span>
        <span>•</span>
        <span>notes <span className="text-foreground font-medium">{counts.note}</span></span>
        <span>•</span>
        <span>readings <span className="text-foreground font-medium">{counts.reading}</span></span>
        <span>•</span>
        <span>papers <span className="text-foreground font-medium">{counts.paper}</span></span>
      </div>

      <Section
        title="Continue writing"
        emptyText="No drafts. Start a new post when you're ready."
        count={drafts.length}
        viewAll="/admin/posts"
      >
        {continueWriting.map((p) => (
          <PostRow key={p.id} post={p} dateField="updatedAt" />
        ))}
      </Section>

      <Section
        title="Recent publishes"
        emptyText="No published posts yet."
        count={published.length}
        viewAll="/admin/posts"
      >
        {recentPublishes.map((p) => (
          <PostRow key={p.id} post={p} dateField="createdAt" />
        ))}
      </Section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Link>
  );
}

function Section({
  title,
  count,
  viewAll,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  viewAll: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const isEmpty = count === 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {!isEmpty && (
          <Link href={viewAll} className="text-xs text-muted-foreground hover:text-foreground">
            view all →
          </Link>
        )}
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{children}</div>
      )}
    </div>
  );
}

function PostRow({
  post,
  dateField = "updatedAt",
}: {
  post: UnifiedPost;
  dateField?: "updatedAt" | "createdAt";
}) {
  const dateLabel = new Date(post[dateField]).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const dateLabelPrefix = dateField === "updatedAt" ? "edited" : "published";
  const editable = post.source === "supabase";
  const titleHref = editable
    ? `/admin/edit/${post.id}`
    : post.isPublished
      ? `/blog/${post.slug}`
      : null;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border rounded-md hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {titleHref ? (
            <Link
              href={titleHref}
              className="font-medium truncate hover:underline underline-offset-2"
            >
              {post.title}
            </Link>
          ) : (
            <span className="font-medium truncate">{post.title}</span>
          )}
          {post.type !== "post" && (
            <span className="font-mono text-[10px] text-muted-foreground shrink-0">[{post.type}]</span>
          )}
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">[{post.source}]</span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          /{post.slug} • {dateLabelPrefix} {dateLabel}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {post.isPublished && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/blog/${post.slug}`} target="_blank">
              <FileTextIcon className="w-4 h-4" />
            </Link>
          </Button>
        )}
        {editable && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/edit/${post.id}`}>
              <PencilIcon className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
