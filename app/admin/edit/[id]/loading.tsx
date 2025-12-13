export default function Loading() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[80vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="mt-4 text-muted-foreground">Loading editor...</p>
    </div>
  );
}
