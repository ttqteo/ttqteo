/**
 * Stands in for a `ReaderArticle` while the server renders it.
 *
 * Shared by every route that renders one, so the shape a reader sees on the way
 * in cannot drift from the shape that arrives. It mirrors the real layout —
 * title block, meta row, body, table of contents — rather than showing a
 * spinner, because the point is that the page does not appear to jump when the
 * content lands.
 *
 * Lives in a component rather than in each `loading.tsx` because Next requires
 * a default export per segment, and three copies of this would be three things
 * to keep in step.
 */
export function ReaderArticleSkeleton() {
  return (
    <div className="w-full mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-[1280px] px-4">
      <article className="flex-1 min-w-0 max-w-[920px] mx-auto lg:mx-0 animate-pulse">
        <div className="flex items-center justify-between mb-7">
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="flex flex-col gap-3 pb-2 w-full mb-6">
          <div className="h-10 sm:h-12 w-3/4 bg-muted rounded" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
          </div>
        </div>
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-[95%] bg-muted rounded" />
          <div className="h-4 w-[90%] bg-muted rounded" />
          <div className="h-4 w-[60%] bg-muted rounded" />
          <div className="h-7 w-2/5 bg-muted rounded mt-8 mb-2" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-[88%] bg-muted rounded" />
          <div className="h-4 w-[92%] bg-muted rounded" />
          <div className="h-4 w-[70%] bg-muted rounded" />
          <div className="h-7 w-1/3 bg-muted rounded mt-8 mb-2" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-[85%] bg-muted rounded" />
          <div className="h-4 w-[75%] bg-muted rounded" />
        </div>
      </article>

      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 py-9 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-5/6 bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
          <div className="h-3 w-4/5 bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      </aside>
    </div>
  );
}
