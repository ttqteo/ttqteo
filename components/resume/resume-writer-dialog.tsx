"use client";

import type { WriterResume } from "@/lib/resume-storage";
import { PenLineIcon } from "lucide-react";
import { ResumeToast } from "./resume-toast";

type Props = {
  entry: WriterResume;
  onDismiss: () => void;
  onContinue: () => void;
};

export function ResumeWriterToast({ entry, onDismiss, onContinue }: Props) {
  return (
    <ResumeToast
      icon={PenLineIcon}
      accent="writer"
      label="Đang viết"
      title={entry.title || "Untitled draft"}
      cta="Mở lại bài viết"
      onDismiss={onDismiss}
      onContinue={onContinue}
    />
  );
}
