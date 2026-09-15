/**
 * Số dòng của một khối code, cho cột số bên trái.
 *
 * Cột vẽ mỗi số thành một phần tử riêng thay vì một chuỗi "1\n2\n…" với
 * `white-space: pre`: trong editor, CSS mà tiptap tự chèn đặt `white-space:
 * normal` cho mọi node không soạn được, và chuỗi đó dồn cả lên một hàng.
 *
 * Cột nằm trong `<pre>`, cạnh `<code>`, và kế thừa cỡ chữ lẫn line-height từ
 * `<pre>` y như `<code>`, nên số thứ n đứng ngang dòng code thứ n mà không
 * phải đo gì. Nó không bao giờ vào nội dung bài: editor vẽ nó ngoài
 * contentDOM, trang đọc chèn nó lúc chạy, và nút copy chỉ đọc `<code>`.
 */
export function lineCount(code: string): number {
  return code.split("\n").length;
}
