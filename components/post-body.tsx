import { PostHtml } from "@/components/post-html";
import { Typography } from "@/components/typography";
import type { ReactNode } from "react";

/**
 * The one place a post body gets its typography, whether it came from an MDX
 * file (already React) or from the editor (HTML in Supabase). Both sources used
 * to carry their own prose classes, so inline code, images and heading spacing
 * looked different depending on where a post happened to be stored.
 *
 * The HTML branch goes through PostHtml, which adds the code-block chrome that
 * MDX gets for free from its own `pre` component. It also carries
 * `editor-html`, which gives that content the same block rhythm the editor
 * shows while it is being written; MDX keeps Typography's looser defaults.
 */
export function PostBody({ children, html }: { children?: ReactNode; html?: string }) {
  return (
    <Typography>{html != null ? <PostHtml html={html} /> : children}</Typography>
  );
}
