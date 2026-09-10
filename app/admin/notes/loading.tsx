// Without its own, /admin/notes would inherit the posts list skeleton.
export default function AdminNotesLoading() {
  return (
    <div className="max-w-3xl mx-auto pt-12 pb-8 px-2 sm:px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-muted animate-pulse rounded" />
        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-56 bg-muted animate-pulse rounded" />
          <div className="h-20 rounded-md border border-dashed bg-muted/40 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
