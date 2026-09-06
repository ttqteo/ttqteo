import { describe, expect, it } from "vitest";
import { toIndexEntry } from "@/lib/index-entries";
import type { UnifiedPost } from "@/lib/posts";

const DAY = 24 * 60 * 60 * 1000;

function post(overrides: Partial<UnifiedPost> & { id: string }): UnifiedPost {
  return {
    slug: `slug-${overrides.id}`,
    title: `Post ${overrides.id}`,
    type: "post",
    isPublished: true,
    source: "mdx",
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
    tags: "",
    ...overrides,
  };
}

const NOW = new Date("2026-02-01T00:00:00.000Z").getTime();

describe("toIndexEntry", () => {
  it("labels the row with a short creation date and groups by its year", () => {
    const entry = toIndexEntry(post({ id: "1" }), NOW);
    expect(entry.year).toBe("Jan 4");
    expect(entry.groupYear).toBe(2026);
  });

  it("links a post to /blog and a guide chapter to its series", () => {
    expect(toIndexEntry(post({ id: "1", slug: "hello" }), NOW).href).toBe("/blog/hello");
    expect(
      toIndexEntry(
        post({ id: "2", slug: "jvm", type: "guide", tags: "java-core" }),
        NOW,
      ).href,
    ).toBe("/series/java-core/jvm");
  });

  it("normalises the tag string into lowercase tags", () => {
    expect(toIndexEntry(post({ id: "1", tags: " AWS, fcj " }), NOW).tags).toEqual([
      "aws",
      "fcj",
    ]);
  });

  it("leaves updatedLabel unset when the edit is under a week after publishing", () => {
    const entry = toIndexEntry(
      post({
        id: "1",
        createdAt: "2026-01-04T00:00:00.000Z",
        updatedAt: "2026-01-09T00:00:00.000Z",
      }),
      NOW,
    );
    expect(entry.updatedLabel).toBeUndefined();
  });

  it("marks a post edited a week or more after publishing", () => {
    const entry = toIndexEntry(
      post({
        id: "1",
        createdAt: "2026-01-04T00:00:00.000Z",
        updatedAt: "2026-01-20T00:00:00.000Z",
      }),
      NOW,
    );
    expect(entry.updatedLabel).toBe("Jan 20");
    expect(entry.updatedRecent).toBe(true);
  });

  it("stops calling an edit recent once it is over 30 days old", () => {
    const entry = toIndexEntry(
      post({
        id: "1",
        createdAt: "2025-10-01T00:00:00.000Z",
        updatedAt: "2025-11-01T00:00:00.000Z",
      }),
      NOW,
    );
    expect(entry.updatedLabel).toBe("Nov 1");
    expect(entry.updatedRecent).toBe(false);
  });

  it("defaults `now` to the current time", () => {
    const entry = toIndexEntry(
      post({
        id: "1",
        createdAt: new Date(Date.now() - 30 * DAY).toISOString(),
        updatedAt: new Date(Date.now() - 1 * DAY).toISOString(),
      }),
    );
    expect(entry.updatedRecent).toBe(true);
  });
});
