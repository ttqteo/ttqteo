import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Get the origin from headers or request URL
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;

  return NextResponse.redirect(new URL("/", origin));
}
