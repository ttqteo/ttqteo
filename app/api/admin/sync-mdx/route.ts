import { syncMdxToSupabase } from "@/lib/sync-mdx-supabase";
import { createSupabaseServerClient, isAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST() {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const result = await syncMdxToSupabase(
    supabase as unknown as Parameters<typeof syncMdxToSupabase>[0],
  );

  return NextResponse.json(result);
}
