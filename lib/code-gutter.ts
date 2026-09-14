/**
 * Chữ cho cột số dòng của một khối code: "1\n2\n…", mỗi số một dòng.
 *
 * Cột này nằm trong `<pre>`, cạnh `<code>`, và kế thừa cỡ chữ lẫn line-height
 * từ `<pre>` y như `<code>`, nên số thứ n đứng ngang dòng code thứ n mà không
 * phải đo gì. Nó không bao giờ vào nội dung bài: editor vẽ nó ngoài
 * contentDOM, trang đọc chèn nó lúc chạy, và nút copy chỉ đọc `<code>`.
 */
export function gutterText(code: string): string {
  const lines = code.split("\n").length;
  return Array.from({ length: lines }, (_, i) => i + 1).join("\n");
}
