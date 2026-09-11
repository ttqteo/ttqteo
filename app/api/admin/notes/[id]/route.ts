import { isUuid } from "@/lib/admin-db";
import { badRequest, dbError, requireAdmin } from "@/lib/admin-api";
import { NOTE_COLUMNS, parseNoteInput } from "@/lib/admin-notes";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT /api/admin/notes/[id]
// Creates the note or replaces it, and the newest edit wins. The browser
// stamps every edit with updated_at, and a write lands only over an older
// version, so a save that arrives late (a slow request, or the keepalive sent
// as a tab closes) cannot overwrite a newer one. The id comes from the browser
// too, which is what lets autosave, a new note's first save and Undo be one
// call. Answers with the note as stored: the newer one when this write lost.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) return badRequest("id không hợp lệ");

  const parsed = parseNoteInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const supabase = await createSupabaseServerClient();
  const row = { id, ...parsed.input };
  // Replaces the stored note only if it is older than this edit.
  const replaceOlder = () =>
    supabase
      .from("admin_notes")
      .update(row)
      .eq("id", id)
      .lt("updated_at", row.updated_at)
      .select(NOTE_COLUMNS);

  let result = await replaceOlder();
  if (!result.error && result.data.length === 0) {
    // Nothing older is stored: create the note. If it exists after all,
    // because another save created it in between, try replacing once more.
    result = await supabase
      .from("admin_notes")
      .upsert(row, { ignoreDuplicates: true })
      .select(NOTE_COLUMNS);
    if (!result.error && result.data.length === 0) result = await replaceOlder();
  }
  if (result.error) return dbError(result.error, "admin notes PUT");
  if (result.data.length > 0) return NextResponse.json({ note: result.data[0] });

  // A newer version is stored; hand it back so the browser can show it.
  const stored = await supabase.from("admin_notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle();
  if (stored.error) return dbError(stored.error, "admin notes PUT");
  // Deleted elsewhere in the moment between the write and this read.
  if (!stored.data) {
    return NextResponse.json({ error: "Note vừa bị xoá ở nơi khác" }, { status: 404 });
  }
  return NextResponse.json({ note: stored.data });
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
