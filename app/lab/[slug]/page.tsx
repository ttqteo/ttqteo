import { Typography } from "@/components/typography";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatDate } from "@/lib/utils";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps) {
  const { slug } = await props.params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blogs")
    .select("title, description, is_published")
    .eq("slug", slug)
    .in("type", ["note", "reading", "paper"])
    .is("deleted_at", null)
    .single();

  if (!data) return {};

  return {
    title: `${!data.is_published ? "[draft] " : ""}${data.title}`,
    description: data.description ?? undefined,
  };
}

export default async function LabSlugPage(props: PageProps) {
  const { slug } = await props.params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blogs")
    .select("slug, title, description, content, cover, is_published, type, created_at, updated_at")
    .eq("slug", slug)
    .in("type", ["note", "reading", "paper"])
    .is("deleted_at", null)
    .single();

  if (!data) {
    notFound();
  }

  return (
    <div className="lg:w-[60%] sm:[95%] md:[75%] mx-auto sm:min-h-[78vh] min-h-[76vh]">
      <Link
        className={buttonVariants({
          variant: "link",
          className: "!mx-0 !px-0 mb-7 !-ml-1 ",
        })}
        href="/lab"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1.5" /> back to lab
      </Link>
      <div className="flex flex-col gap-3 pb-2 w-full mb-2">
        <div className="flex items-center gap-2">
          {data.type && (
            <span className="font-mono text-xs text-muted-foreground">
              [{data.type}]
            </span>
          )}
        </div>
        <h1 className="sm:text-4xl text-5xl font-semibold mb-2">{data.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(data.updated_at ?? data.created_at)}
        </p>
      </div>

      <div className="!w-full text-lg">
        {data.content ? (
          <Typography>
            <div dangerouslySetInnerHTML={{ __html: data.content }} />
          </Typography>
        ) : (
          <p className="text-muted-foreground italic">No content yet.</p>
        )}
      </div>
    </div>
  );
}
