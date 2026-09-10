import { NextResponse } from "next/server";

// Never cached, and never prerendered: an answer from the build that is being
// replaced is exactly the answer this route must not give.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** The build the server is running right now. */
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
