import { describe, expect, it } from "vitest";
import { convertsToWebp, extensionFor } from "./image-format";

describe("convertsToWebp", () => {
  it("ảnh chụp màn hình và ảnh chụp thường đều đổi sang WebP", () => {
    expect(convertsToWebp("image/png")).toBe(true);
    expect(convertsToWebp("image/jpeg")).toBe(true);
    expect(convertsToWebp("image/webp")).toBe(true);
  });

  it("GIF và SVG để nguyên: đổi qua canvas thì mất chuyển động, mất nét vector", () => {
    expect(convertsToWebp("image/gif")).toBe(false);
    expect(convertsToWebp("image/svg+xml")).toBe(false);
  });

  it("không phải ảnh thì không đụng tới", () => {
    expect(convertsToWebp("application/pdf")).toBe(false);
  });
});

describe("extensionFor", () => {
  it("theo loại thật của nội dung", () => {
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/gif")).toBe("gif");
  });

  it("các loại có tên đuôi khác tên MIME", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/svg+xml")).toBe("svg");
  });

  it("không rõ loại thì vẫn có một đuôi", () => {
    expect(extensionFor("")).toBe("bin");
  });
});
