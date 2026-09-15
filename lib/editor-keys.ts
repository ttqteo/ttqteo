/**
 * Phím của trang soạn bài. Hàm thuần, chỉ đọc mấy trường cần của
 * KeyboardEvent, để test không phải dựng sự kiện thật.
 */

/**
 * Ctrl+S, hay ⌘S trên Mac. Đọc `key` chứ không đọc `code` để đi theo bố cục
 * bàn phím đang dùng, và hạ về chữ thường vì bật Caps Lock thì `key` là "S".
 * Thêm Shift hay Alt là tổ hợp khác: Ctrl+Shift+S gạch ngang chữ trong editor,
 * còn Ctrl+Alt là AltGr trên bàn phím Windows, dùng để gõ ký tự.
 */
export function isSaveShortcut(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">,
): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "s"
  );
}

/**
 * Phím này đang chốt chữ cho bộ gõ (bộ gõ tiếng Việt của macOS, IME) chứ
 * không nhắm vào trang. Enter lúc đó là để xác nhận chữ đang ghép dở.
 *
 * Safari bắn keydown của phím chốt sau `compositionend`, lúc `isComposing` đã
 * về false; khi đó chỉ còn keyCode 229 để nhận ra.
 */
export function isComposingKey(
  event: Pick<KeyboardEvent, "isComposing" | "keyCode">,
): boolean {
  return event.isComposing || event.keyCode === 229;
}
