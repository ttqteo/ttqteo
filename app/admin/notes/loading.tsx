// Without its own, /admin/notes would inherit the posts list skeleton.
export default function AdminNotesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-2 pb-8 pt-12 sm:px-4">
      <div className="mb-5 flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="mx-auto mb-3 h-9 max-w-xl animate-pulse rounded-md border bg-muted/40" />
      <div className="mx-auto mb-5 h-6 w-56 animate-pulse rounded-full bg-muted/40" />
      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
        {[28, 40, 24, 36, 32, 20, 44, 28].map((height, i) => (
          <div
            key={i}
            style={{ height: `${height * 4}px` }}
            className="mb-3 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
