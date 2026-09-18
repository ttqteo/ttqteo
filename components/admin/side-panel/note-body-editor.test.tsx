import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoteBodyEditor } from "./note-body-editor";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** TipTap hangs the editor on its own DOM node. */
async function editorIn(container: HTMLElement): Promise<Editor> {
  return waitFor(() => {
    const dom = container.querySelector(".ProseMirror") as (HTMLElement & { editor?: Editor }) | null;
    if (!dom?.editor) throw new Error("no editor yet");
    return dom.editor;
  });
}

function selectFirstChip(editor: Editor) {
  let at = -1;
  editor.state.doc.descendants((node, pos) => {
    if (at < 0 && node.type.name === "linkChip") at = pos;
  });
  act(() => {
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, at)));
  });
}

describe("NoteBodyEditor link menu", () => {
  it("shows the selected chip's full URL as a link that opens in a new tab", async () => {
    const { container } = render(<NoteBodyEditor body={`đọc ${URL}`} onChange={vi.fn()} />);
    expect(screen.queryByRole("toolbar")).toBeNull();
    selectFirstChip(await editorIn(container));
    const open = screen.getByRole("link", { name: /Mở link/ });
    expect(open).toHaveAttribute("href", URL);
    expect(open).toHaveAttribute("target", "_blank");
  });

  it("copies the full URL", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    // Only the clipboard: ProseMirror reads the rest of navigator (userAgent).
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = render(<NoteBodyEditor body={`đọc ${URL}`} onChange={vi.fn()} />);
    selectFirstChip(await editorIn(container));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(writeText).toHaveBeenCalledWith(URL);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it("turns the chip back into its URL to edit, caret at the end, without an edit to save", async () => {
    const onChange = vi.fn();
    const { container } = render(<NoteBodyEditor body={`đọc ${URL}`} onChange={onChange} />);
    const editor = await editorIn(container);
    selectFirstChip(editor);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Sửa link" }));
    });
    expect(container.querySelector("[data-link-chip]")).toBeNull();
    expect(editor.state.selection.from).toBe(editor.state.doc.content.size - 1);
    expect(screen.queryByRole("toolbar")).toBeNull();
    // The text is the same note, so nothing new goes to the server.
    expect(onChange).not.toHaveBeenCalled();
  });
});

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
