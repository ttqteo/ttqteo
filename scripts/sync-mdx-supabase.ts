import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { syncMdxToSupabase } from "../lib/sync-mdx-supabase";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service role only. The anon key used to be the fallback, and it could only
  // write while `blogs` let anyone write (fix_permissions.sql). Under the
  // admin-only policies RLS drops the update without an error, so the run would
  // report rows as soft-deleted that were never touched.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn(
      "[sync] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; skipping MDX↔Supabase sync.",
    );
    return 0;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const res = await syncMdxToSupabase(
    supabase as unknown as Parameters<typeof syncMdxToSupabase>[0],
  );

  console.log(`[sync] MDX slugs: ${res.mdxSlugs.length}`);
  console.log(`[sync] DB rows conflicting with MDX: ${res.dbSlugsBefore}`);
  if (res.conflictsSoftDeleted.length > 0) {
    console.log(
      `[sync] soft-deleted ${res.conflictsSoftDeleted.length} DB rows:\n  - ${res.conflictsSoftDeleted.join("\n  - ")}`,
    );
  }
  for (const err of res.errors) console.error(`[sync] error: ${err}`);
  return res.errors.length > 0 ? 1 : 0;
}

main()
  .then((code) => {
    // Set exitCode and let the event loop drain naturally so any
    // keep-alive sockets close before the process exits. Using
    // process.exit() here triggers a libuv assertion on Windows.
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
