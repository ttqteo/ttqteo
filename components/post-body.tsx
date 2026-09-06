import { Typography } from "@/components/typography";
import type { ReactNode } from "react";

/**
 * The one place a post body gets its typography, whether it came from an MDX
 * file (already React) or from the editor (HTML in Supabase). Both sources used
 * to carry their own prose classes, so inline code, images and heading spacing
 * looked different depending on where a post happened to be stored.
 */
export function PostBody({ children, html }: { children?: ReactNode; html?: string }) {
  return (
    <Typography>
      {html != null ? <div dangerouslySetInnerHTML={{ __html: html }} /> : children}
    </Typography>
  );
}
