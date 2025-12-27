# Mindmap SVG Mode - Test Cases

## Canvas Navigation

### TC-001: 2-finger Touchpad Pan

- **Action**: Dùng 2 ngón di chuyển trên touchpad (không nhấn Ctrl)
- **Expected**: Canvas di chuyển theo hướng swipe, không delay đáng kể

### TC-002: Pinch to Zoom

- **Action**: Dùng 2 ngón pinch (bóp/mở) trên touchpad
- **Expected**: Canvas zoom in/out mượt mà

### TC-003: Click and Drag Pan

- **Action**: Click vào vùng trống và kéo
- **Expected**: Canvas di chuyển theo hướng kéo

### TC-004: Zoom Buttons

- **Action**: Click nút +/- ở góc dưới phải
- **Expected**: Canvas zoom in/out theo step

### TC-005: Fit to View

- **Action**: Click nút "fit"
- **Expected**: Canvas scale và center để hiển thị toàn bộ mindmap

---

## Node Editing

### TC-010: Double-click to Edit

- **Action**: Double-click vào node
- **Expected**: Mở edit mode, cursor focus vào text

### TC-011: Edit and Save (Blur)

- **Action**: Edit text → click ra ngoài
- **Expected**: Text được save, edit mode đóng

### TC-012: Edit and Save (Enter)

- **Action**: Edit text → nhấn Enter
- **Expected**: Text được save, tạo sibling node mới bên dưới

### TC-013: Add Child Node (Tab)

- **Action**: Đang edit → nhấn Tab
- **Expected**: Text được save, tạo child node mới

### TC-014: Add Sibling Node (Shift+Tab)

- **Action**: Đang edit → nhấn Shift+Tab
- **Expected**: Text được save, tạo sibling node mới

### TC-015: Cancel Edit (Escape) - Existing Node

- **Action**: Edit node có sẵn → nhấn Escape
- **Expected**: Giữ nguyên text cũ, đóng edit mode

### TC-016: Cancel Edit (Escape) - New Placeholder Node

- **Action**: Tạo node mới (text "...") → nhấn Escape ngay
- **Expected**: Node bị xóa, không để lại ".."

### TC-016a: Cancel Edit (Escape) - New Node After Typing

- **Action**: Tạo node mới → gõ text → nhấn Escape
- **Expected**: Node bị xóa (vì original text là "..."), text đã gõ bị mất

### TC-017: Delete Node by Clearing Text

- **Action**: Xóa hết text trong node → blur
- **Expected**: Node bị xóa (trừ root node)

### TC-018: Long Text Wrapping - Display Mode

- **Action**: Node có sẵn text dài (>50 ký tự)
- **Expected**: Text wrap đúng trong node box, không tràn ra ngoài

### TC-019: Long Text Wrapping - Edit Mode

- **Action**: Gõ text dài trong khi đang edit (>50 ký tự)
- **Expected**:
  - Node tự mở rộng width/height theo text
  - Overlay hiển thị trên cùng, không bị sibling nodes che
  - Solid background che hoàn toàn các nodes bên dưới

### TC-019a: Long Text - No Overlap with Siblings

- **Action**: Tạo node giữa 2 siblings → gõ text rất dài
- **Expected**: Edit overlay có background trắng, sibling nodes bên dưới không hiện text xuyên qua

### TC-019b: Long Text - Cursor Position

- **Action**: Gõ text dài → di chuyển cursor trong text
- **Expected**: Cursor hiển thị đúng vị trí, không bị lệch so với text

### TC-019c: Long Text - After Save

- **Action**: Gõ text dài → blur để save
- **Expected**: Node resize đúng theo text mới, layout không bị overlap

---

## Node Operations

### TC-020: Collapse Node

- **Action**: Click nút "-" bên cạnh node có children
- **Expected**: Children bị ẩn, hiện badge số lượng descendants

### TC-021: Expand Node

- **Action**: Click nút "+" bên cạnh collapsed node
- **Expected**: Children hiện lại

### TC-022: Delete Node (Backspace on Empty)

- **Action**: Select node → Backspace khi text rỗng
- **Expected**: Node bị xóa

---

## Render Modes

### TC-030: Switch Render Mode

- **Action**: Click nút mode ở toolbar
- **Expected**: Cycle qua Brainstorm → Study → Classic

### TC-031: Brainstorm Mode Style

- **Verify**: Root có background, children có underline, level 3+ có nét đứt

### TC-032: Study Mode Style

- **Verify**: Tất cả nodes có box, màu phân biệt theo level

### TC-033: Classic Mode Style

- **Verify**: Style truyền thống, tương tự Study

---

## Mini Map

### TC-040: Toggle Mini Map

- **Action**: Click nút mini map ở toolbar
- **Expected**: Mini map hiện/ẩn

### TC-041: Mini Map Viewport

- **Verify**: Viewport indicator phản ánh đúng vùng đang xem

### TC-042: Mini Map Navigation

- **Action**: Click vào vị trí trong mini map
- **Expected**: Main canvas di chuyển tới vị trí tương ứng

---

## Edge Cases

### TC-050: Vietnamese Text with Diacritics

- **Action**: Nhập text tiếng Việt có dấu (ví dụ: "Lưu trữ dữ liệu")
- **Expected**: Text hiển thị đúng, node width phù hợp

### TC-051: Multiline Text

- **Action**: Nhập text nhiều dòng (Shift+Enter)
- **Expected**: Node mở rộng height để chứa nhiều dòng

### TC-052: IME Composition (Telex/VNI)

- **Action**: Gõ tiếng Việt bằng Telex/VNI
- **Expected**: Không trigger save/action khi đang compose

### TC-053: Root Node Cannot Be Deleted

- **Action**: Cố gắng xóa root node
- **Expected**: Root node vẫn còn

---

## Performance

### TC-060: Large Mindmap (50+ nodes)

- **Verify**: Pan/zoom vẫn mượt, không lag đáng kể

### TC-061: Rapid Editing

- **Action**: Gõ text nhanh liên tục
- **Expected**: Không mất ký tự, không flicker
