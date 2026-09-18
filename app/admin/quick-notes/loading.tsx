// Without its own, /admin/quick-notes would inherit the posts list skeleton.
export default function AdminQuickNotesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-2 pb-8 pt-12 sm:px-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-6">
        <div>
          <div className="mb-3 h-9 animate-pulse rounded-md border bg-muted/40" />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
            ))}
          </div>
        </div>
        <div className="hidden h-64 animate-pulse rounded-lg border bg-muted/40 lg:block" />
      </div>
    </div>
  );
}
