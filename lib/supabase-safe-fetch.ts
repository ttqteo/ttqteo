// Safely fetch from Supabase with timeout protection
export type SafeFetchResult<T> =
  | { success: true; data: T }
  | { success: false; error: "timeout" | "db_error"; message: string };

/**
 * Wraps a Supabase query with timeout protection
 * @param queryFn - The async Supabase query to execute
 * @param timeoutMs - Timeout in milliseconds (default: 8000ms for Vercel free tier)
 * @returns SafeFetchResult with success/error state
 */
export async function safeFetch<T>(
  queryFn: () => Promise<T>,
  timeoutMs = 8000 // Leave 2s buffer before Vercel's 10s timeout
): Promise<SafeFetchResult<T>> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), timeoutMs)
  );

  try {
    const data = await Promise.race([queryFn(), timeoutPromise]);
    return { success: true, data };
  } catch (error: any) {
    if (error.message === "timeout") {
      return {
        success: false,
        error: "timeout",
        message: "Database is waking up. Please refresh in a few seconds.",
      };
    }

    console.error("Supabase error:", error);
    return {
      success: false,
      error: "db_error",
      message: error.message || "Database error occurred",
    };
  }
}
