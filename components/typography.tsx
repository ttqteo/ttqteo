import { PropsWithChildren } from "react";

export function Typography({ children }: PropsWithChildren) {
  return (
    <div className="prose prose-zinc dark:prose-invert prose-code:font-normal prose-code:font-code prose-code:bg-muted prose-pre:bg-background prose-headings:scroll-m-20 w-[85vw] sm:w-full sm:mx-auto prose-code:text-sm prose-code:leading-6 prose-code:text-foreground prose-code:p-[0.085rem] prose-code:rounded-md prose-code:border pt-2 !min-w-full prose-img:rounded-md prose-img:border prose-code:px-1.5 prose-code:overflow-x-auto !max-w-none prose-img:my-3 prose-h2:my-4 prose-h2:mt-8 prose-code:break-all">
      {children}
    </div>
  );
}
