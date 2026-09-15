import { dbError, requireAdmin } from "@/lib/admin-api";
import { doneCutoff } from "@/lib/admin-tasks";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/tasks
// Open tasks, plus the ones finished recently enough that the panel still
// lists them. Older finished tasks stay in the table, unlisted.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const since = doneCutoff(new Date()).toISOString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_tasks")
    .select("id, title, due_on, done_at, created_at, updated_at")
    .or(`done_at.is.null,done_at.gte."${since}"`)
    .order("created_at", { ascending: true });

  if (error) return dbError(error, "admin tasks GET");
  return NextResponse.json({ tasks: data });
}
