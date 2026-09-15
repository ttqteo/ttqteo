import { describe, expect, it } from "vitest";
import { isComposingKey, isSaveShortcut } from "./editor-keys";

const key = (
  k: string,
  mods: Partial<Record<"ctrlKey" | "metaKey" | "shiftKey" | "altKey", boolean>> = {},
) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("isSaveShortcut", () => {
  it("Ctrl+S", () => {
    expect(isSaveShortcut(key("s", { ctrlKey: true }))).toBe(true);
  });

  it("⌘S trên Mac", () => {
    expect(isSaveShortcut(key("s", { metaKey: true }))).toBe(true);
  });

  it("vẫn nhận khi bật Caps Lock", () => {
    expect(isSaveShortcut(key("S", { ctrlKey: true }))).toBe(true);
  });

  it("chữ s trần là gõ chữ", () => {
    expect(isSaveShortcut(key("s"))).toBe(false);
  });

  it("Ctrl+Shift+S là gạch ngang chữ, không phải lưu", () => {
    expect(isSaveShortcut(key("S", { ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it("Ctrl+Alt+S (AltGr trên Windows) là gõ ký tự", () => {
    expect(isSaveShortcut(key("s", { ctrlKey: true, altKey: true }))).toBe(false);
  });

  it("phím khác có Ctrl", () => {
    expect(isSaveShortcut(key("d", { ctrlKey: true }))).toBe(false);
  });
});

describe("isComposingKey", () => {
  it("đang ghép chữ cho bộ gõ", () => {
    expect(isComposingKey({ isComposing: true, keyCode: 13 })).toBe(true);
  });

  it("Safari: phím chốt đến sau compositionend, chỉ còn keyCode 229", () => {
    expect(isComposingKey({ isComposing: false, keyCode: 229 })).toBe(true);
  });

  it("Enter bình thường", () => {
    expect(isComposingKey({ isComposing: false, keyCode: 13 })).toBe(false);
  });
});
