import { isAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { isAdmin: await isAdmin() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
