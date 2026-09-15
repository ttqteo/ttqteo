/**
 * Loại ảnh để nguyên khi tải lên. Đổi sang WebP đi qua canvas, nên GIF mất
 * chuyển động và SVG thành ảnh raster.
 */
const KEEP_AS_IS = new Set(["image/gif", "image/svg+xml"]);

/** Ảnh này có đổi sang WebP trước khi tải lên không. */
export function convertsToWebp(type: string): boolean {
  return type.startsWith("image/") && !KEEP_AS_IS.has(type);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

/**
 * Đuôi file theo loại thật của nội dung, không theo tên gốc: ảnh dán từ
 * clipboard tên là `image.png` dù đã đổi sang WebP.
 */
export function extensionFor(type: string): string {
  return EXTENSIONS[type] ?? (type.split("/")[1] || "bin");
}
