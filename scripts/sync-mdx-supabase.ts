/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { syncMdxToSupabase } from "../lib/sync-mdx-supabase";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "[sync] missing SUPABASE env vars; skipping MDX↔Supabase sync.",
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
