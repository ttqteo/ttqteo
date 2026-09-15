import { describe, expect, it } from "vitest";
import { editorTitle } from "./editor-title";

describe("editorTitle", () => {
  it("theo tiêu đề bài", () => {
    expect(editorTitle("Java là gì")).toBe("edit • Java là gì");
  });

  it("chưa có tiêu đề thì là New Post, không phải một chữ edit trơ trọi", () => {
    expect(editorTitle("")).toBe("edit • New Post");
    expect(editorTitle("   ")).toBe("edit • New Post");
  });
});
