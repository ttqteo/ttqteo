/**
 * Tiêu đề tab của trang soạn. Một chỗ cho cả metadata của route (lúc vào
 * trang, và mỗi khi Next áp lại metadata) lẫn effect phía client (lúc đang gõ
 * tiêu đề), để hai bên không bao giờ nói hai điều khác nhau.
 */
export function editorTitle(title: string): string {
  return `edit • ${title.trim() || "New Post"}`;
}
