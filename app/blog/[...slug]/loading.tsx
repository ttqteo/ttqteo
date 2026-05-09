export default function Loading() {
  return (
    <div className="lg:w-[60%] sm:w-[95%] md:w-[75%] mx-auto sm:min-h-[78vh] min-h-[76vh] animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-7" />
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
        <div className="h-4 w-full bg-muted rounded mt-6" />
        <div className="h-4 w-[88%] bg-muted rounded" />
        <div className="h-4 w-[70%] bg-muted rounded" />
      </div>
    </div>
  );
}
