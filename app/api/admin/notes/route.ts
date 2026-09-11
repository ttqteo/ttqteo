import { dbError, requireAdmin } from "@/lib/admin-api";
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
    .select("id, body, pinned, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return dbError(error, "admin notes GET");
  return NextResponse.json({ notes: data });
}
