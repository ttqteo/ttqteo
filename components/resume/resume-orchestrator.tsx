"use client";

import {
  getReaderResume,
  getWriterResume,
  hasResumeShown,
  markResumeShown,
  type ReaderResume,
  type WriterResume,
} from "@/lib/resume-storage";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResumeReaderToast } from "./resume-reader-dialog";
import { ResumeWriterToast } from "./resume-writer-dialog";
import { markResumePending } from "./scroll-restorer";

type Props = { isAdmin: boolean };

export function ResumeOrchestrator({ isAdmin }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [reader, setReader] = useState<ReaderResume | null>(null);
  const [writer, setWriter] = useState<WriterResume | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [writerOpen, setWriterOpen] = useState(false);

  useEffect(() => {
    if (hasResumeShown()) return;

    const w = isAdmin ? getWriterResume() : null;
    const r = getReaderResume();

    const writerSamePage = w && pathname === w.route;
    const readerSamePage = r && pathname === `/blog/${r.slug}`;

    const writerCandidate = w && !writerSamePage ? w : null;
    const readerCandidate = r && !readerSamePage ? r : null;

    if (!writerCandidate && !readerCandidate) return;

    markResumeShown();
    if (writerCandidate) {
      setWriter(writerCandidate);
      setWriterOpen(true);
    }
    if (readerCandidate) {
      setReader(readerCandidate);
      setReaderOpen(true);
    }
  }, [isAdmin, pathname]);

  const continueWriter = () => {
    if (!writer) return;
    setWriterOpen(false);
    router.push(writer.route);
  };

  const continueReader = () => {
    if (!reader) return;
    setReaderOpen(false);
    markResumePending();
    router.push(`/blog/${reader.slug}`, { scroll: false });
  };

  if (!writerOpen && !readerOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {writerOpen && writer && (
        <ResumeWriterToast
          entry={writer}
          onDismiss={() => setWriterOpen(false)}
          onContinue={continueWriter}
        />
      )}
      {readerOpen && reader && (
        <ResumeReaderToast
          entry={reader}
          onDismiss={() => setReaderOpen(false)}
          onContinue={continueReader}
        />
      )}
    </div>
  );
}
