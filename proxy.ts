import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // The post list moved to /admin. Redirecting here rather than from a page
  // component gives a real 307 — inside the route the layout has already
  // streamed, so `redirect()` can only degrade to a client-side hop.
  if (request.nextUrl.pathname === "/admin/posts") {
    const target = request.nextUrl.clone();
    target.pathname = "/admin";
    // `?view=` is what /admin reads too, so the old links carry over as-is.
    return NextResponse.redirect(target, 307);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/callback"],
};
