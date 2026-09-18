// Without its own, /admin/tasks would inherit the posts list skeleton.
export default function AdminTasksLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-2 pb-8 pt-12 sm:px-4">
      <div className="flex items-center justify-between px-3">
        <div className="h-7 w-20 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="mx-3 h-9 animate-pulse rounded-md border bg-muted/40" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="mx-3 h-8 animate-pulse rounded bg-muted/40" />
      ))}
    </div>
  );
}
