import { describe, expect, it } from "vitest";
import { gutterText } from "./code-gutter";

describe("gutterText", () => {
  it("một số cho mỗi dòng", () => {
    expect(gutterText("a\nb\nc")).toBe("1\n2\n3");
  });

  it("khối trống vẫn có dòng 1", () => {
    expect(gutterText("")).toBe("1");
  });

  it("dòng trống cuối cũng được đếm, như editor vẽ nó", () => {
    expect(gutterText("a\n")).toBe("1\n2");
  });
});
