import { PropsWithChildren } from "react";
import type { CalloutVariant } from "@/components/extensions/callout";

type NoteProps = PropsWithChildren & {
  title?: string;
  type?: "note" | "danger" | "warning" | "success";
};

// `success` là tên cũ trong các file MDX đã viết; nó là `tip` ở phía callout.
const VARIANT: Record<NonNullable<NoteProps["type"]>, CalloutVariant> = {
  note: "note",
  danger: "danger",
  warning: "warning",
  success: "tip",
};

export default function Note({ children, title = "Note", type = "note" }: NoteProps) {
  const variant = VARIANT[type];
  return (
    <div className={`callout callout-${variant}`} data-callout={variant}>
      {title !== "" && <p className="callout-title">{title}</p>}
      {children}
    </div>
  );
}
