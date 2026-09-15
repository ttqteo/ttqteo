import { TextSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";

/**
 * Khi nào mỗi bubble của editor được hiện. Ba bubble không bao giờ hiện cùng
 * lúc, và luật đó chỉ đọc được khi ba điều kiện nằm cạnh nhau:
 *
 * - không chọn gì, con trỏ trong link: bubble link
 * - không chọn gì mà con trỏ trong bảng, hoặc kéo chọn nhiều ô: bubble bảng
 * - bôi đen chữ, ở đâu cũng vậy: bubble định dạng
 *
 * Hàm ở cấp module chứ không viết trong component: BubbleMenu phát một
 * transaction `updateOptions` mỗi khi `shouldShow` đổi identity, và editor
 * render lại ở mọi transaction (xem `LINK_BUBBLE_OPTIONS` trong
 * simple-editor.tsx).
 */

type BubbleContext = { editor: Editor };

export function formatBubbleShouldShow({ editor }: BubbleContext): boolean {
  const { selection } = editor.state;
  if (!editor.isEditable || selection.empty) return false;
  // Chọn nguyên một khối (ảnh, link card) hay nhiều ô bảng thì không phải chữ.
  if (!(selection instanceof TextSelection)) return false;
  // Khối code không nhận định dạng chữ.
  return !selection.$from.parent.type.spec.code;
}

export function linkBubbleShouldShow({ editor }: BubbleContext): boolean {
  // Bôi đen chữ trong link là việc của bubble định dạng, nơi nút Link sáng lên.
  return editor.isEditable && editor.state.selection.empty && editor.isActive("link");
}

export function tableBubbleShouldShow({ editor }: BubbleContext): boolean {
  const { selection } = editor.state;
  if (!editor.isEditable) return false;
  // Xét trước `isActive`: với vùng chọn nhiều ô, `isActive("table")` cộng
  // từng ô lại và thiếu phần ranh giới giữa các ô, nên có thể trả về false.
  if (selection instanceof CellSelection) return true;
  // Con trỏ trong link thì bubble link đang mở.
  return selection.empty && editor.isActive("table") && !editor.isActive("link");
}
