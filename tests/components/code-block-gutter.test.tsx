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
    expect(container.querySelector(".code-gutter")?.textContent).toBe("1\n2\n3");
    expect(container.querySelector(".code-gutter")?.getAttribute("contenteditable")).toBe(
      "false",
    );
    // Phần soạn được chỉ có code, không lẫn số.
    expect(container.querySelector("pre > code")?.textContent).toBe(
      "int a;\nint b;\nint c;",
    );
  });
});
