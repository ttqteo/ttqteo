import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkedText, NoteLinks } from "./note-links";

type Call = { url: string; body: string; resolve: (r: unknown) => void };
let calls: Call[] = [];

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const answer = (url: string, title: string, description: string | null = null) => ({
  url,
  title,
  description,
  image: null,
  favicon: null,
  siteName: null,
  embedSrc: null,
  embeddable: false,
});

beforeEach(() => {
  calls = [];
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, init: RequestInit = {}) =>
        new Promise((resolve) => {
          calls.push({ url, body: String(init.body), resolve });
        }),
    ),
  );
  // happy-dom would otherwise fetch the player page behind an iframe src.
  const dom = (globalThis as { happyDOM?: { settings: { disableIframePageLoading: boolean } } })
    .happyDOM;
  if (dom) dom.settings.disableIframePageLoading = true;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("LinkedText", () => {
  it("shows each URL as a chip with its site and path, not as a link", () => {
    render(
      <p>
        <LinkedText text="đọc https://www.orcarouter.ai/ và https://console.groq.com/home?x=1" />
      </p>,
    );
    expect(screen.getByText("orcarouter.ai")).toBeInTheDocument();
    expect(screen.getByText("console.groq.com/home")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows a YouTube link with its poster frame", () => {
    render(
      <p>
        <LinkedText text="https://youtu.be/dQw4w9WgXcQ" />
      </p>,
    );
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(document.querySelector("img")?.getAttribute("src")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
    );
  });
});

describe("NoteLinks", () => {
  it("renders nothing for a note without links", () => {
    const { container } = render(<NoteLinks body="harness" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens a link in a new tab, and fills in its title once the route has read it", async () => {
    render(<NoteLinks body={"free key\nhttps://a.example/x"} />);
    const link = screen.getByRole("link", { name: "a.example/x" });
    expect(link).toHaveAttribute("href", "https://a.example/x");
    expect(link).toHaveAttribute("target", "_blank");

    expect(calls).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/admin/unfurl");
    expect(JSON.parse(calls[0].body)).toEqual({ url: "https://a.example/x" });

    await act(async () => {
      calls[0].resolve(ok(answer("https://a.example/x", "Example A", "Blurb")));
    });
    expect(screen.getByText("Example A")).toBeInTheDocument();
    expect(screen.getByText("Blurb")).toBeInTheDocument();
  });

  it("plays a YouTube link in place when its poster is pressed", () => {
    render(<NoteLinks body="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90" />);
    expect(document.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Phát video" }));
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90&autoplay=1",
    );
  });

  it("waits for a link being typed to hold still before looking it up", () => {
    const { rerender } = render(<NoteLinks body="https://b.example/ab" />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender(<NoteLinks body="https://b.example/abc" />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(calls).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].body)).toEqual({ url: "https://b.example/abc" });
  });
});
