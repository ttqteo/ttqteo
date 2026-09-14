import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth-callback] exchange failed:", error.message);
  } else {
    // Google hay Supabase báo lỗi thì quay về đây với `?error=` thay vì `?code=`.
    console.error(
      "[auth-callback] no code:",
      searchParams.get("error_description") ?? searchParams.get("error") ?? "(none)",
    );
  }

  // Về /admin, nơi có nút đăng nhập, kèm cờ để trang báo lỗi. Trang /login cũ
  // đã bỏ, nên trước đây lỗi nào cũng rơi vào một trang 404 không nói gì.
  return NextResponse.redirect(`${origin}/admin?login=failed`);
}
