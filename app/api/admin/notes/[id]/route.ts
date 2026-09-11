import { isUuid } from "@/lib/admin-db";
import { badRequest, dbError, requireAdmin } from "@/lib/admin-api";
import { parseNoteInput } from "@/lib/admin-notes";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT /api/admin/notes/[id]
// Creates the note or replaces it. The id comes from the browser, which is
// what lets autosave, the first save of a new note and Undo be one call.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const parsed = parseNoteInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .upsert({ id, ...parsed.input, updated_at: new Date().toISOString() })
    .select("id, body, pinned, created_at, updated_at")
    .single();

  if (error) return dbError(error, "admin notes PUT");
  return NextResponse.json({ note: data });
}

// DELETE /api/admin/notes/[id]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admin_notes").delete().eq("id", id);

  if (error) return dbError(error, "admin notes DELETE");
  return NextResponse.json({ ok: true });
}
