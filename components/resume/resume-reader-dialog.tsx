"use client";

import type { ReaderResume } from "@/lib/resume-storage";
import { BookOpenIcon } from "lucide-react";
import { ResumeToast } from "./resume-toast";

type Props = {
  entry: ReaderResume;
  onDismiss: () => void;
  onContinue: () => void;
};

export function ResumeReaderToast({ entry, onDismiss, onContinue }: Props) {
  const position = entry.headingText
    ? `Đọc tiếp từ “${entry.headingText}”`
    : `Đọc tiếp từ ${Math.round(entry.scrollPct * 100)}%`;

  return (
    <ResumeToast
      icon={BookOpenIcon}
      accent="reader"
      label="Đang đọc"
      title={entry.title}
      cta={position}
      onDismiss={onDismiss}
      onContinue={onContinue}
    />
  );
}
