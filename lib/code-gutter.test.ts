import { describe, expect, it } from "vitest";
import { lineCount } from "./code-gutter";

describe("lineCount", () => {
  it("một dòng cho mỗi đoạn giữa hai dấu xuống dòng", () => {
    expect(lineCount("a\nb\nc")).toBe(3);
  });

  it("khối trống vẫn có dòng 1", () => {
    expect(lineCount("")).toBe(1);
  });

  it("dòng trống cuối cũng được đếm, như editor vẽ nó", () => {
    expect(lineCount("a\n")).toBe(2);
  });
});
