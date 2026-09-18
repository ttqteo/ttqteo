import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoteBodyEditor } from "./note-body-editor";

afterEach(cleanup);

const URL = "https://www.omelet.tech/deepseek-v4-1-trieu-token/?fbclid=IwY2xjawRcl";

describe("NoteBodyEditor", () => {
  it("shows each URL of the note short, the full URL on hover", async () => {
    const { container } = render(
      <NoteBodyEditor body={`openrouter - ai provider\n${URL}\n\nđọc`} onChange={vi.fn()} />,
    );
    const chip = await waitFor(() => {
      const found = container.querySelector<HTMLElement>("[data-link-chip]");
      if (!found) throw new Error("no chip yet");
      return found;
    });
    expect(chip.textContent).toBe("omelet.tech/deepseek-v4-1-trieu-token");
    expect(chip.title).toBe(URL);
    expect(container.textContent).toContain("openrouter - ai provider");
    expect(container.textContent).not.toContain("fbclid");
  });

  it("shows a newer body from elsewhere without reporting it as an edit", async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<NoteBodyEditor body="một" onChange={onChange} />);
    await waitFor(() => expect(container.textContent).toContain("một"));
    rerender(<NoteBodyEditor body={"hai\nhttps://b.com"} onChange={onChange} />);
    await waitFor(() => expect(container.querySelector("[data-link-chip]")).not.toBeNull());
    expect(container.textContent).toContain("hai");
    expect(onChange).not.toHaveBeenCalled();
  });
});
