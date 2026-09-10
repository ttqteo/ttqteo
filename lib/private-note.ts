/**
 * Ghi chú riêng của người viết: một khối `<aside data-private-note>` trong HTML
 * của bài, soạn bằng node PrivateNote (components/extensions/private-note.tsx).
 * Nó có mặt trong editor để nhắc việc và không bao giờ tới tay người đọc.
 *
 * Cắt ở đây, trên server, trước khi HTML rời máy chủ. Giấu bằng CSS thì không
 * đủ: chuỗi vẫn nằm trong HTML lẫn payload RSC, xem source là đọc được.
 *
 * Quét chuỗi thay vì parse DOM, vì hàm này chạy trong server component, nơi
 * không có DOMParser. Việc đó an toàn vì HTML ở đây luôn do `editor.getHTML()`
 * phát ra: cú pháp đã chuẩn, và chữ `<aside` nằm trong nội dung (kể cả trong
 * khối code) đã bị escape thành `&lt;aside`, nên chỉ thẻ thật mới khớp.
 */
export const PRIVATE_NOTE_ATTR = "data-private-note";

const ASIDE_TAG = /<(\/?)aside\b[^>]*>/gi;
const OPENS_NOTE = new RegExp(`\\s${PRIVATE_NOTE_ATTR}(?=[\\s=/>])`, "i");

/** Vị trí một ghi chú: `start`/`end` bao cả thẻ bọc, `body*` chỉ phần ruột. */
type NoteSpan = { start: number; bodyStart: number; bodyEnd: number; end: number };

/** Các ghi chú ngoài cùng theo thứ tự; ghi chú lồng trong ghi chú thuộc về cái bọc nó. */
function findNotes(html: string): NoteSpan[] {
  const spans: NoteSpan[] = [];
  if (!html.includes(PRIVATE_NOTE_ATTR)) return spans;

  let start = 0;
  let bodyStart = 0;
  // Độ sâu `<aside>` tính từ thẻ mở của ghi chú đang quét; 0 là đang ở ngoài.
  let depth = 0;
  let match: RegExpExecArray | null;
  ASIDE_TAG.lastIndex = 0;

  while ((match = ASIDE_TAG.exec(html)) !== null) {
    const closing = match[1] === "/";
    if (depth === 0) {
      if (closing || !OPENS_NOTE.test(match[0])) continue;
      start = match.index;
      bodyStart = match.index + match[0].length;
      depth = 1;
      continue;
    }
    // Mọi `<aside>` bên trong đều được đếm, kể cả loại không phải ghi chú, để
    // thẻ đóng khớp đúng thẻ mở của ghi chú chứ không phải thẻ đầu tiên gặp.
    depth += closing ? -1 : 1;
    if (depth === 0) {
      spans.push({ start, bodyStart, bodyEnd: match.index, end: match.index + match[0].length });
    }
  }

  // Ghi chú không có thẻ đóng thì kéo tới hết chuỗi. Với việc cắt, lỡ cắt thừa
  // một đoạn còn hơn để ghi chú lọt lên trang công khai; với việc đọc ở trang
  // admin, hiện thừa còn hơn làm mất ghi chú.
  if (depth > 0) spans.push({ start, bodyStart, bodyEnd: html.length, end: html.length });
  return spans;
}

export function stripPrivateNotes(html: string): string {
  let out = "";
  let cursor = 0;
  for (const span of findNotes(html)) {
    out += html.slice(cursor, span.start);
    cursor = span.end;
  }
  return out + html.slice(cursor);
}

/** Phần ruột HTML của từng ghi chú, không kèm thẻ bọc, cho trang /admin/notes. */
export function extractPrivateNotes(html: string): string[] {
  return findNotes(html).map((span) => html.slice(span.bodyStart, span.bodyEnd));
}
