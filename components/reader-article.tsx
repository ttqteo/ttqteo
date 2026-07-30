import { FadedScroll } from "@/components/faded-scroll";
import {
  ReaderContent,
  ReaderControlsAnchor,
  ReaderSidebar,
  ScrollToTopButton,
} from "@/components/reader-controls";
import { ReaderProgressTracker } from "@/components/resume/reader-progress-tracker";
import { ScrollRestorer } from "@/components/resume/scroll-restorer";
import TocObserver from "@/components/toc-observer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export type ReaderToc = { level: number; text: string; href: string };

/**
 * Shell đọc bài dùng chung cho /blog/[...slug] và /[topic]/[...slug]:
 * back link, title, tags, TOC sidebar, reader controls, progress tracking.
 * Nội dung bài và phần meta/footer khác nhau giữa hai trang nên là slots.
 */
export function ReaderArticle({
  slug,
  title,
  backHref,
  backLabel,
  headerAction,
  tags = [],
  meta,
  tocs,
  footer,
  children,
}: {
  slug: string;
  title: string;
  backHref: string;
  backLabel: string;
  headerAction?: React.ReactNode;
  tags?: string[];
  meta?: React.ReactNode;
  tocs: ReaderToc[];
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full mx-auto sm:min-h-[78vh] min-h-[76vh] flex gap-10 max-w-[1280px] px-4">
      <ReaderControlsAnchor hasToc={tocs.length > 0} />
      <article className="flex-1 min-w-0 max-w-[920px] mx-auto lg:mx-0">
        <div className="flex items-center justify-between mb-7">
          <Link
            className={buttonVariants({
              variant: "link",
              className: "!mx-0 !px-0 !-ml-1",
            })}
            href={backHref}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1.5" /> {backLabel}
          </Link>
          {headerAction}
        </div>
        <div className="flex flex-col gap-3 pb-2 w-full mb-2">
          <h1 className="sm:text-3xl text-3xl font-semibold mb-2 leading-tight">
            {title}
          </h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-1 mb-1">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="font-mono text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          {meta}
        </div>

        <div className="!w-full prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-h2:font-semibold prose-h3:font-semibold prose-h4:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-h3:mt-6 prose-h3:mb-2">
          <ReaderContent>{children}</ReaderContent>
        </div>
        {footer}
      </article>

      <ReaderSidebar hasToc={tocs.length > 0}>
        <FadedScroll className="flex-1 min-h-0 pb-2 pt-0.5 pr-2">
          <TocObserver data={tocs} />
        </FadedScroll>
      </ReaderSidebar>
      <ScrollToTopButton />
      <ReaderProgressTracker slug={slug} title={title} />
      <ScrollRestorer slug={slug} />
    </div>
  );
}
