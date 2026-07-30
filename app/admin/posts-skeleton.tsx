/** Shared by the Suspense fallback (first load) and the pending swap (filtering). */
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
