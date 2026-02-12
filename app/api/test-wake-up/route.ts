import { createSupabaseServerClient } from "@/lib/supabase-server";
import { safeFetch } from "@/lib/supabase-safe-fetch";
import { NextResponse } from "next/server";

/**
 * Test endpoint to verify Supabase wake-up handling
 *
 * Usage:
 * 1. Wait for Supabase to pause (1 week of inactivity)
 * 2. Call GET /api/test-wake-up
 * 3. Should return 503 on first try (timeout while waking)
 * 4. Auto-retry should succeed
 *
 * Or manually test:
 * curl https://yoursite.com/api/test-wake-up
 */
export async function GET() {
  const startTime = Date.now();

  const supabase = await createSupabaseServerClient();

  const result = await safeFetch(
    async () => {
      // Simple query to test connection
      const { data, error } = await supabase
        .from("blogs")
        .select("id")
        .limit(1);

      if (error) throw error;
      return data;
    },
    8000 // 8 second timeout
  );

  const duration = Date.now() - startTime;

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.message,
        code: result.error,
        duration_ms: duration,
        message:
          result.error === "timeout"
            ? "Database is waking up. Retry in a few seconds."
            : "Database error occurred.",
      },
      { status: result.error === "timeout" ? 503 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    duration_ms: duration,
    message: "Database is awake and responding!",
    data_count: result.data.length,
  });
}
