import { getAllPosts, getSupabasePosts, type UnifiedPost } from "@/lib/posts";
import { getUser } from "@/lib/supabase-server";
import { cache } from "react";

/**
 * The sidebar and the table each await this independently so they can stream as
 * two separate Suspense boundaries. `cache` keeps that from turning into two
 * round-trips to Supabase per request.
 */
export const loadAdminPosts = cache(
  async (): Promise<{ active: UnifiedPost[]; trash: UnifiedPost[] }> => {
    const [active, trash] = await Promise.all([
      getAllPosts({ view: "active" }),
      getSupabasePosts("trash"),
    ]);

    // TEMPORARY diagnostic for the intermittent "no supabase posts" report.
    // Every active supabase row is a draft, and RLS hides drafts from anon, so
    // a render that still knows who you are but comes back with 0 supabase rows
    // means this request's query client lost the session while `getUser()` kept
    // it. Anon's fingerprint is exactly `sb=0 trash=7`.
    const user = await getUser();
    const sb = active.filter((p) => p.source === "supabase").length;
    console.log(
      `[admin-diag] user=${user?.email ?? "NONE"} sb=${sb} mdx=${active.length - sb} trash=${trash.length}`,
    );

    return { active, trash };
  },
);
