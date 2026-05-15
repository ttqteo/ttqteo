import {
  createSupabaseServerClient,
  getUser,
  isAdmin,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/posts/by-slug?slug=xxx — admin lookup of supabase post id by slug
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("blogs")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id: data.id });
}
