"use client";

import { extractLinks, linkLabel, splitLinks } from "@/lib/note-links";
import { cn } from "@/lib/utils";
import { parseYoutubeUrl, youtubeEmbedSrc, youtubeThumbnailSrc, type YoutubeRef } from "@/lib/youtube";
import { ExternalLinkIcon, LinkIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { loadUnfurl, readUnfurl, subscribeUnfurl } from "./unfurl-cache";

/** How many of a note's links get looked up; the rest show their URL only. */
export const MAX_UNFURLS = 8;
/** How long a link must sit unchanged before it is looked up, so a URL being typed is not. */
const UNFURL_DELAY_MS = 800;

const noServerAnswer = () => undefined;

/**
 * What is known about `url`: undefined while nothing is, null when the route
 * could not read it. With `lookup`, asks the route once the link has held
 * still; without, only shows what an earlier lookup left in the cache.
 */
function useUnfurl(url: string, lookup: boolean) {
  const answer = useSyncExternalStore(subscribeUnfurl, () => readUnfurl(url), noServerAnswer);
  useEffect(() => {
    if (!lookup || readUnfurl(url) !== undefined) return;
    const timer = window.setTimeout(() => void loadUnfurl(url), UNFURL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [url, lookup]);
  return answer;
}

/** A remote image that removes itself rather than show the browser's broken-image glyph. */
const hideOnError = (event: SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.display = "none";
};

/**
 * A line of note text with each URL shown as a chip: the site and path, or
 * the title if the note has been opened and its links looked up. A YouTube
 * link carries its poster frame. For the cards, which are buttons, so the
 * chips are not links themselves; the card opens the note, where they are.
 */
export function LinkedText({ text }: { text: string }) {
  const parts = useMemo(() => splitLinks(text), [text]);
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "text" ? part.text : <LinkChip key={index} url={part.url} />,
      )}
    </>
  );
}

function LinkChip({ url }: { url: string }) {
  const answer = useUnfurl(url, false);
  const video = parseYoutubeUrl(url);
  const label = answer?.title || (video ? "YouTube" : linkLabel(url));

  return (
    <span
      title={url}
      className="inline-flex max-w-full items-center gap-1 rounded bg-muted px-1.5 py-px align-baseline text-[11px] text-foreground/80"
    >
      {video ? (
        // eslint-disable-next-line @next/next/no-img-element -- YouTube's own CDN, no remotePatterns entry
        <img
          src={youtubeThumbnailSrc(video.videoId)}
          alt=""
          onError={hideOnError}
          className="h-3.5 w-6 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <LinkIcon className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * The links of the note being edited, as cards under its text: a YouTube
 * link plays in place, any other opens in a new tab with its title, blurb
 * and favicon once the unfurl route has read the page.
 */
export function NoteLinks({ body }: { body: string }) {
  const links = useMemo(() => extractLinks(body), [body]);
  if (links.length === 0) return null;

  return (
    <ul aria-label="Liên kết trong note" className="space-y-2 border-t px-3 py-3">
      {links.map((url, index) => (
        <li key={url}>
          <NoteLinkCard url={url} lookup={index < MAX_UNFURLS} />
        </li>
      ))}
    </ul>
  );
}

function NoteLinkCard({ url, lookup }: { url: string; lookup: boolean }) {
  const answer = useUnfurl(url, lookup);
  const video = parseYoutubeUrl(url);
  if (video) return <YoutubeCard url={url} video={video} title={answer?.title ?? null} />;

  const title = answer?.title || linkLabel(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/50"
    >
      {answer?.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element -- any site's favicon, no remotePatterns entry
        <img
          src={answer.favicon}
          alt=""
          onError={hideOnError}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
        />
      ) : (
        <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {answer?.description && (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
            {answer.description}
          </span>
        )}
        {answer?.title && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {linkLabel(url)}
          </span>
        )}
      </span>
      {answer?.image && (
        // eslint-disable-next-line @next/next/no-img-element -- any site's og:image, no remotePatterns entry
        <img
          src={answer.image}
          alt=""
          loading="lazy"
          onError={hideOnError}
          className="h-12 w-[72px] shrink-0 rounded-md object-cover"
        />
      )}
    </a>
  );
}

/** Poster frame with a play button; the player loads only once it is pressed. */
function YoutubeCard({
  url,
  video,
  title,
}: {
  url: string;
  video: YoutubeRef;
  title: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const embed = youtubeEmbedSrc(video.videoId, video.start);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {playing ? (
        <div className="relative aspect-video bg-black">
          <iframe
            src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
            title={title ?? "YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={title ? `Phát: ${title}` : "Phát video"}
          className="group relative block aspect-video w-full bg-black"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own CDN, no remotePatterns entry */}
          <img
            src={youtubeThumbnailSrc(video.videoId)}
            alt=""
            onError={hideOnError}
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white transition-colors",
                "group-hover:bg-red-600 group-focus-visible:bg-red-600",
              )}
            >
              <PlayIcon className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
            </span>
          </span>
        </button>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-2.5 py-2 transition-colors hover:bg-muted/50"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title ?? "YouTube"}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          YouTube
          <ExternalLinkIcon className="h-3 w-3" aria-hidden />
        </span>
      </a>
    </div>
  );
}
