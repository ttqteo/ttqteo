// Without its own, /admin/calendar would inherit the posts list skeleton.
export default function AdminCalendarLoading() {
  return (
    <div className="mx-auto max-w-6xl px-2 pb-8 pt-12 sm:px-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-7 w-44 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        <div className="h-[34rem] animate-pulse rounded-lg border bg-muted/40" />
        <div className="mt-6 h-64 animate-pulse rounded-lg border bg-muted/40 lg:mt-0" />
      </div>
    </div>
  );
}
