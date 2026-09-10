import { act, render, waitFor } from "@testing-library/react";
import { Profiler, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimpleEditor } from "@/components/simple-editor";
import { TooltipProvider } from "@/components/ui/tooltip";

// The real hook builds a Supabase browser client on every render, which needs
// env this test has no business carrying. Uploading is not what is under test.
vi.mock("@/components/use-image-upload", () => ({
  useImageUpload: () => ({ uploadImage: async () => null, isUploading: false }),
}));

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

/**
 * Regression for the loop that crashed the editor on the first scroll.
 *
 * `shouldRerenderOnTransaction` re-renders the editor on every transaction,
 * and tiptap's BubbleMenu dispatches an `updateOptions` transaction whenever
 * its `shouldShow` or `options` props change identity. The link bubble passed
 * both inline, so they changed identity on every render: each re-render
 * dispatched, and each dispatch re-rendered, until React gave up with
 * "Maximum update depth exceeded".
 *
 * BubbleMenu skips its first options update after registering, so the loop
 * only armed after mount and fired on the next re-render from any source. On
 * the editor page that was scrolling, which hands the title to the header and
 * re-renders the whole editor with a fresh `onChange`. A plain parent
 * re-render is what this simulates.
 */
describe("SimpleEditor re-render stability", () => {
  let errors: string[];

  beforeEach(() => {
    errors = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("settles after a parent re-render instead of looping", async () => {
    let commits = 0;
    const ui = (onChange: (html: string) => void): ReactNode => (
      <TooltipProvider>
        <Profiler
          id="editor"
          onRender={() => {
            commits += 1;
          }}
        >
          <SimpleEditor content="<p>hello</p>" onChange={onChange} />
        </Profiler>
      </TooltipProvider>
    );

    const { container, rerender } = render(ui(() => {}));
    await waitFor(() =>
      expect(container.querySelector(".ProseMirror")).not.toBeNull(),
    );
    // Let the bubble menu register and spend its skipped first update, so the
    // re-render below is the one that would have tripped the loop.
    await settle();

    commits = 0;
    // A fresh callback, exactly what the editor page passes on every render.
    await act(async () => {
      rerender(ui(() => {}));
    });
    await settle();

    expect(errors.join("\n")).not.toMatch(/Maximum update depth/);
    // One commit for the re-render itself. The loop ran this into the dozens
    // before React stopped it.
    expect(commits).toBeLessThan(5);
  });
});
