import { beforeEach, describe, expect, it } from "vitest";
import {
  clearReaderResume,
  clearWriterResume,
  getReaderResume,
  getWriterResume,
  hasResumeShown,
  markResumeShown,
  READER_RESUME_KEY,
  READER_TTL_MS,
  RESUME_SHOWN_KEY,
  setReaderResume,
  setWriterResume,
  WRITER_RESUME_KEY,
  WRITER_TTL_MS,
} from "./resume-storage";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("resume-storage", () => {
  it("round-trips reader entry", () => {
    setReaderResume({
      slug: "foo/bar",
      title: "Foo",
      scrollPct: 0.42,
      headingId: "intro",
      updatedAt: 1000,
    });
    const got = getReaderResume(1000);
    expect(got?.slug).toBe("foo/bar");
    expect(got?.scrollPct).toBeCloseTo(0.42);
    expect(got?.headingId).toBe("intro");
  });

  it("round-trips writer entry", () => {
    setWriterResume({
      postId: "abc",
      title: "Draft",
      route: "/admin/edit/abc",
      updatedAt: 1000,
    });
    expect(getWriterResume(1000)?.postId).toBe("abc");
  });

  it("expires reader after TTL and removes key", () => {
    setReaderResume({ slug: "s", title: "t", scrollPct: 0.1, updatedAt: 0 });
    const got = getReaderResume(READER_TTL_MS + 1);
    expect(got).toBeNull();
    expect(window.localStorage.getItem(READER_RESUME_KEY)).toBeNull();
  });

  it("expires writer after TTL", () => {
    setWriterResume({ postId: "a", title: "t", route: "/x", updatedAt: 0 });
    expect(getWriterResume(WRITER_TTL_MS + 1)).toBeNull();
    expect(window.localStorage.getItem(WRITER_RESUME_KEY)).toBeNull();
  });

  it("returns null and clears on corrupt JSON", () => {
    window.localStorage.setItem(READER_RESUME_KEY, "{not json");
    expect(getReaderResume()).toBeNull();
    expect(window.localStorage.getItem(READER_RESUME_KEY)).toBeNull();
  });

  it("returns null when updatedAt is missing", () => {
    window.localStorage.setItem(WRITER_RESUME_KEY, JSON.stringify({ postId: "x" }));
    expect(getWriterResume()).toBeNull();
  });

  it("clears reader and writer entries", () => {
    setReaderResume({ slug: "s", title: "t", scrollPct: 0.5, updatedAt: Date.now() });
    setWriterResume({ postId: "a", title: "t", route: "/x", updatedAt: Date.now() });
    clearReaderResume();
    clearWriterResume();
    expect(getReaderResume()).toBeNull();
    expect(getWriterResume()).toBeNull();
  });

  it("tracks session-shown flag", () => {
    expect(hasResumeShown()).toBe(false);
    markResumeShown();
    expect(hasResumeShown()).toBe(true);
    expect(window.sessionStorage.getItem(RESUME_SHOWN_KEY)).toBe("1");
  });
});
