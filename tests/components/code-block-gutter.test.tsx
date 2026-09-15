import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SimpleEditor } from "@/components/simple-editor";
import { TooltipProvider } from "@/components/ui/tooltip";

// Như simple-editor-rerender.test.tsx: hook upload dựng Supabase client, thứ
// test này không cần.
vi.mock("@/components/use-image-upload", () => ({
  useImageUpload: () => ({ uploadImage: async () => null, isUploading: false }),
}));

describe("số dòng của khối code trong editor", () => {
  it("một số cho mỗi dòng, nằm ngoài phần chữ soạn được", async () => {
    const { container } = render(
      <TooltipProvider>
        <SimpleEditor
          content={'<pre><code class="language-java">int a;\nint b;\nint c;</code></pre>'}
          onChange={() => {}}
        />
      </TooltipProvider>,
    );
    await waitFor(() =>
      expect(container.querySelector(".code-gutter")).not.toBeNull(),
    );
    const gutter = container.querySelector(".code-gutter")!;
    // Mỗi số một phần tử, không phải một chuỗi "1\n2\n3": trong editor, CSS mà
    // tiptap tự chèn đặt `white-space: normal` cho mọi node không soạn được, nên
    // các dấu xuống dòng trong chuỗi bị gộp thành dấu cách, số dồn lên một hàng.
    expect(Array.from(gutter.children, (line) => line.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(gutter.getAttribute("contenteditable")).toBe("false");
    // Phần soạn được chỉ có code, không lẫn số.
    expect(container.querySelector("pre > code")?.textContent).toBe(
      "int a;\nint b;\nint c;",
    );
  });
});
