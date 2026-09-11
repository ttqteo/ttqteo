import { dbError, requireAdmin } from "@/lib/admin-api";
import { NOTE_COLUMNS } from "@/lib/admin-notes";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/notes
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .select(NOTE_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) return dbError(error, "admin notes GET");
  // Private notes: kept by no shared cache, and not by the browser's either.
  return NextResponse.json({ notes: data }, { headers: { "Cache-Control": "private, no-store" } });
}
