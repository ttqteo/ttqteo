/** The table on its own. Filtering no longer swaps it: that happens locally now. */
export function PostsSectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-14 rounded bg-muted animate-pulse" />
      <div className="border rounded-md divide-y">
        <div className="h-9 bg-muted/30" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-4 rounded bg-muted animate-pulse"
                style={{ width: `${65 - (i % 4) * 10}%` }}
              />
              <div className="h-3 w-2/5 rounded bg-muted/60 animate-pulse" />
            </div>
            <div className="hidden sm:block h-3 w-24 rounded bg-muted/60 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stands in for the whole screen on first load. Filtering never reaches this
 * any more — the browser holds the list and re-filters in place — so the only
 * wait left is the one round trip that fetches it.
 */
export function PostsBrowserSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-md bg-muted animate-pulse lg:hidden" />
          <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block w-44 shrink-0 space-y-5">
          {[4, 4, 2].map((rows, group) => (
            <div key={group}>
              <div className="h-2.5 w-12 rounded bg-muted animate-pulse mb-2.5" />
              <div className="space-y-1.5">
                {Array.from({ length: rows }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 w-full rounded bg-muted/60 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="h-9 w-full sm:max-w-xs rounded-md bg-muted animate-pulse" />
          <PostsSectionSkeleton />
        </div>
      </div>
    </>
  );
}
