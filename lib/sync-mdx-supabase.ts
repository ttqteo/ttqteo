import { promises as fs } from "fs";
import path from "path";

export type SyncResult = {
  mdxSlugs: string[];
  dbSlugsBefore: number;
  conflictsSoftDeleted: string[];
  errors: string[];
};

async function walkMdxSlugs(dir: string, base: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walkMdxSlugs(abs, base)));
    } else if (e.isFile() && e.name.endsWith(".mdx") && !e.name.startsWith("_")) {
      const rel = path.relative(base, abs).replace(/\\/g, "/");
      out.push(rel.replace(/\.mdx$/, ""));
    }
  }
  return out;
}

export async function listMdxSlugs(): Promise<string[]> {
  const blogFolder = path.join(process.cwd(), "contents/blogs");
  try {
    return await walkMdxSlugs(blogFolder, blogFolder);
  } catch {
    return [];
  }
}

/**
 * Soft-delete (or hard-delete) Supabase blog rows whose slug also exists as an MDX file.
 * MDX is the source of truth; duplicates in DB cause stale-title bugs on the list page.
 */
export async function syncMdxToSupabase(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        in: (
          col: string,
          values: string[],
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      update: (patch: Record<string, unknown>) => {
        in: (
          col: string,
          values: string[],
        ) => Promise<{ error: { message: string } | null }>;
      };
    };
  },
): Promise<SyncResult> {
  const mdxSlugs = await listMdxSlugs();
  const result: SyncResult = {
    mdxSlugs,
    dbSlugsBefore: 0,
    conflictsSoftDeleted: [],
    errors: [],
  };

  if (mdxSlugs.length === 0) return result;

  const { data, error } = await supabase
    .from("blogs")
    .select("id, slug, deleted_at")
    .in("slug", mdxSlugs);

  if (error) {
    result.errors.push(`select: ${error.message}`);
    return result;
  }

  const rows = (data as { id: string; slug: string; deleted_at: string | null }[]) || [];
  const conflicting = rows.filter((r) => !r.deleted_at);
  result.dbSlugsBefore = conflicting.length;

  if (conflicting.length === 0) return result;

  const { error: upErr } = await supabase
    .from("blogs")
    .update({ deleted_at: new Date().toISOString() })
    .in(
      "id",
      conflicting.map((r) => r.id),
    );

  if (upErr) {
    result.errors.push(`soft-delete: ${upErr.message}`);
    return result;
  }

  result.conflictsSoftDeleted = conflicting.map((r) => r.slug);
  return result;
}
