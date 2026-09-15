import { isUuid } from "@/lib/admin-db";
import { badRequest, dbError, requireAdmin } from "@/lib/admin-api";
import { parseTaskInput } from "@/lib/admin-tasks";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT /api/admin/tasks/[id]
// Creates the task or replaces it, with the id the browser made, so adding,
// editing, ticking and Undo are all this one call.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const parsed = parseTaskInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_tasks")
    .upsert({ id, ...parsed.input, updated_at: new Date().toISOString() })
    .select("id, title, due_on, done_at, created_at, updated_at")
    .single();

  if (error) return dbError(error, "admin tasks PUT");
  return NextResponse.json({ task: data });
}

// DELETE /api/admin/tasks/[id]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admin_tasks").delete().eq("id", id);

  if (error) return dbError(error, "admin tasks DELETE");
  return NextResponse.json({ ok: true });
}
