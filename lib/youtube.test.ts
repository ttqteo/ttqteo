import { describe, expect, it } from "vitest";
import { parseYoutubeUrl, youtubeEmbedSrc, youtubeThumbnailSrc } from "./youtube";

describe("parseYoutubeUrl", () => {
  it("reads the id from a watch URL", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      videoId: "dQw4w9WgXcQ",
      start: null,
    });
  });

  it("reads the id from a youtu.be short link", () => {
    expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      videoId: "dQw4w9WgXcQ",
      start: null,
    });
  });

  it("reads the id from shorts, live, and embed paths", () => {
    for (const path of ["shorts", "live", "embed"]) {
      expect(parseYoutubeUrl(`https://www.youtube.com/${path}/dQw4w9WgXcQ`)).toEqual({
        videoId: "dQw4w9WgXcQ",
        start: null,
      });
    }
  });

  it("accepts the mobile, music, and nocookie hosts", () => {
    for (const host of ["m.youtube.com", "music.youtube.com", "www.youtube-nocookie.com"]) {
      expect(parseYoutubeUrl(`https://${host}/watch?v=dQw4w9WgXcQ`)?.videoId).toBe(
        "dQw4w9WgXcQ",
      );
    }
  });

  it("keeps other query params from breaking the parse", () => {
    expect(
      parseYoutubeUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=4&pp=abc",
      )?.videoId,
    ).toBe("dQw4w9WgXcQ");
  });

  it("surrounding whitespace is trimmed", () => {
    expect(parseYoutubeUrl("  https://youtu.be/dQw4w9WgXcQ \n")?.videoId).toBe(
      "dQw4w9WgXcQ",
    );
  });

  describe("start time", () => {
    it("reads bare seconds", () => {
      expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=90")?.start).toBe(90);
    });

    it("reads the 90s suffix form", () => {
      expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=90s")?.start).toBe(90);
    });

    it("reads the 1h2m3s form", () => {
      expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=1h2m3s")?.start).toBe(
        3723,
      );
    });

    it("reads the start param a share link uses", () => {
      expect(
        parseYoutubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ?start=42")?.start,
      ).toBe(42);
    });

    it("reads a #t= hash", () => {
      expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ#t=2m")?.start).toBe(120);
    });

    it("treats zero and junk as no start time", () => {
      expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=0")?.start).toBeNull();
      expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=soon")?.start).toBeNull();
    });
  });

  describe("rejects", () => {
    it("non-YouTube hosts", () => {
      expect(parseYoutubeUrl("https://vimeo.com/watch?v=dQw4w9WgXcQ")).toBeNull();
      // A host that merely ends in the YouTube domain must not pass.
      expect(parseYoutubeUrl("https://notyoutube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
      expect(parseYoutubeUrl("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ")).toBeNull();
    });

    it("ids that are not 11 URL-safe characters", () => {
      expect(parseYoutubeUrl("https://youtu.be/short")).toBeNull();
      expect(parseYoutubeUrl("https://youtu.be/waaaaaaaaaaaaytoolong")).toBeNull();
      expect(parseYoutubeUrl("https://www.youtube.com/watch?v=bad/chars!")).toBeNull();
    });

    it("YouTube pages that are not a video", () => {
      expect(parseYoutubeUrl("https://www.youtube.com/@someuser")).toBeNull();
      expect(parseYoutubeUrl("https://www.youtube.com/results?search_query=x")).toBeNull();
    });

    it("non-http protocols and non-URLs", () => {
      expect(parseYoutubeUrl("javascript:alert(1)")).toBeNull();
      expect(parseYoutubeUrl("just some pasted prose")).toBeNull();
      expect(parseYoutubeUrl("")).toBeNull();
    });

    it("text that merely contains a URL", () => {
      // Pasting a paragraph that mentions a video should stay a paragraph.
      expect(
        parseYoutubeUrl("xem cái này https://youtu.be/dQw4w9WgXcQ hay lắm"),
      ).toBeNull();
    });
  });
});

describe("youtubeEmbedSrc", () => {
  it("builds a nocookie embed URL", () => {
    expect(youtubeEmbedSrc("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("appends a start time when there is one", () => {
    expect(youtubeEmbedSrc("dQw4w9WgXcQ", 90)).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90",
    );
  });

  it("ignores a zero or null start", () => {
    expect(youtubeEmbedSrc("dQw4w9WgXcQ", 0)).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(youtubeEmbedSrc("dQw4w9WgXcQ", null)).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });
});

describe("youtubeThumbnailSrc", () => {
  it("points at the medium poster frame YouTube serves for every video", () => {
    expect(youtubeThumbnailSrc("dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
    );
  });
});
