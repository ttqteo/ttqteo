function SkeletonRow({ withDescription = false }: { withDescription?: boolean }) {
  return (
    <li>
      <div
        className={`flex gap-4 items-start ${withDescription ? "py-6" : "py-3"} px-2 -mx-2 border-t border-border/60`}
      >
        <span className="w-14 shrink-0 pt-1">
          <span className="block h-3 w-10 rounded bg-muted animate-pulse" />
        </span>
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-4">
            <span className="block h-4 w-2/3 rounded bg-muted animate-pulse" />
            <span className="block h-4 w-4 rounded bg-muted animate-pulse shrink-0 mt-0.5" />
          </div>
          {withDescription && (
            <span className="block mt-3 h-3 w-5/6 rounded bg-muted animate-pulse" />
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonSection({ rows }: { rows: number }) {
  return (
    <section>
      <span className="block h-3 w-12 rounded bg-muted animate-pulse mb-2" />
      <ul>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} withDescription={i % 3 === 0} />
        ))}
      </ul>
    </section>
  );
}

export default function Loading() {
  return (
    <div className="w-full mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-[1280px] px-4 py-12">
      <article className="flex-1 min-w-0 max-w-[920px] mx-auto lg:mx-0">
        <header className="mb-8">
          <span className="block h-9 w-24 rounded bg-muted animate-pulse" />
        </header>
        <div className="space-y-10">
          <SkeletonSection rows={5} />
          <SkeletonSection rows={3} />
        </div>
      </article>
      <div className="hidden lg:block shrink-0 w-[220px]" aria-hidden />
    </div>
  );
}
