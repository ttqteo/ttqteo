/**
 * Recognising a YouTube URL well enough to embed it.
 *
 * Kept separate from the tiptap node so the matching rules — which is where
 * the bugs live — can be tested without booting an editor.
 */

export type YoutubeRef = {
  videoId: string;
  /** Seconds to start at, or null for the beginning. */
  start: number | null;
};

/** YouTube ids are exactly 11 URL-safe base64 characters. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Compared against the full hostname after stripping a leading `www.`, never
 * with `endsWith` — `youtube.com.evil.test` must not match.
 */
const HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
]);

/** Path prefixes that carry the id in the next segment. */
const ID_IN_PATH = new Set(["embed", "shorts", "live", "v"]);

/**
 * YouTube writes start times three ways: bare seconds (`t=90`), a duration
 * suffix (`t=1h2m3s`, and `t=90s`), or the `start=` param embeds use.
 */
function parseStart(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return seconds > 0 ? seconds : null;
  }

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(trimmed);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const seconds =
    Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return seconds > 0 ? seconds : null;
}

/** Pulls `t=…` out of a `#t=2m` style fragment. */
function startFromHash(hash: string): string | null {
  const match = /[#&]?t=([^&]+)/.exec(hash);
  return match ? match[1] : null;
}

/**
 * Returns the video reference for a string that is *only* a YouTube video URL,
 * or null for anything else. Deliberately strict: this drives a paste handler,
 * and turning a paragraph that merely mentions a link into a player would be
 * worse than doing nothing.
 */
export function parseYoutubeUrl(raw: string | null | undefined): YoutubeRef | null {
  const text = raw?.trim();
  if (!text || /\s/.test(text)) return null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = segments[0] ?? null;
  } else if (HOSTS.has(host)) {
    if (segments[0] === "watch") {
      videoId = url.searchParams.get("v");
    } else if (segments[0] && ID_IN_PATH.has(segments[0])) {
      videoId = segments[1] ?? null;
    }
  }

  if (!videoId || !VIDEO_ID.test(videoId)) return null;

  const start = parseStart(
    url.searchParams.get("t") ??
      url.searchParams.get("start") ??
      startFromHash(url.hash),
  );

  return { videoId, start };
}

/**
 * The `src` an embed iframe gets. `youtube-nocookie.com` keeps the player from
 * writing tracking cookies for readers who never press play.
 */
export function youtubeEmbedSrc(videoId: string, start?: number | null): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  return start && start > 0 ? `${base}?start=${start}` : base;
}

/**
 * The 320x180 poster frame. YouTube serves it for every video with no API
 * key, so a thumbnail needs nothing but the id, unlike the title.
 */
export function youtubeThumbnailSrc(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
