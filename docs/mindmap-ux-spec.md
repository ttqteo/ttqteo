# Mindmap UX Enhancement Spec v1.0

## 1. Keyboard Behavior (XMind-style)

### 1.1 Phím Enter

| Context                      | Hành vi                                |
| ---------------------------- | -------------------------------------- |
| Node đang focus (không edit) | Tạo sibling mới phía dưới → auto edit  |
| Node đang edit               | Lưu text → tạo sibling mới → auto edit |
| Root node                    | Tạo child (không có sibling của root)  |
| Node rỗng (draft)            | Delete node → focus parent             |

### 1.2 Phím Tab

| Context              | Hành vi                              |
| -------------------- | ------------------------------------ |
| Node đang focus/edit | Lưu text → tạo child mới → auto edit |
| Node collapsed       | Expand trước → tạo child             |

### 1.3 Phím Shift + Tab

| Context                | Hành vi                                         |
| ---------------------- | ----------------------------------------------- |
| Node đang focus        | "Promote" node: chuyển thành sibling của parent |
| Node là child của root | Không làm gì (không thể promote)                |
| Node đang edit         | Lưu → Promote → focus vào node                  |

### 1.4 Phím Backspace

| Context                   | Hành vi                                           |
| ------------------------- | ------------------------------------------------- |
| Node đang edit, có text   | Xóa ký tự bình thường                             |
| Node đang edit, text rỗng | Delete node → focus vào sibling trước hoặc parent |
| Root node rỗng            | Set text về "..." (không delete root)             |
| Node có children          | Merge children lên parent trước khi delete        |

### 1.5 Phím Escape

| Context                | Hành vi                       |
| ---------------------- | ----------------------------- |
| Node đang edit         | Cancel edit → revert text gốc |
| Node draft (text rỗng) | Delete node → focus parent    |
| Node không edit        | Deselect node                 |

### 1.6 Phím Arrow Keys (Future)

| Phím | Hành vi                                |
| ---- | -------------------------------------- |
| ↑    | Focus sibling trước                    |
| ↓    | Focus sibling sau                      |
| ←    | Focus parent                           |
| →    | Focus first child (nếu có) hoặc expand |

---

## 2. Draft/Ghost Node System

### 2.1 Concept

```
[Normal Node] ←→ [Draft Node] ←→ [Deleted]
     ↑                ↑
   commit           timeout/Esc
```

### 2.2 Quy tắc tạo Draft Node

- Khi nhấn `Tab` hoặc `Enter` → tạo **Draft Node**
- Draft node **chưa commit** vào tree data
- Chỉ hiển thị visual, không persist

### 2.3 Commit Conditions

Draft → Normal khi:

- User nhập text ≥ 1 ký tự có nghĩa (không chỉ space)
- User nhấn `Enter` hoặc `Tab` (tạo node tiếp theo)
- User click ra ngoài (blur)

### 2.4 Auto-Delete Conditions

Draft → Deleted khi:

- Text rỗng + nhấn `Esc`
- Text rỗng + nhấn `Backspace`
- Text rỗng + blur (click outside)
- Timeout 30s không tương tác (optional)

### 2.5 UI States

| State   | Visual                                            |
| ------- | ------------------------------------------------- |
| Draft   | Border dashed, opacity 70%, text placeholder ".." |
| Normal  | Border solid, opacity 100%                        |
| Editing | Border highlight (primary color), shadow          |

### 2.6 Data Model

```typescript
interface MindmapNode {
  id: string;
  text: string;
  children: MindmapNode[];
  isDraft?: boolean; // true = chưa commit
}
```

---

## 3. Auto Layout & Collapsible

### 3.1 Spacing Theo Depth

| Depth | Horizontal Gap | Vertical Gap |
| ----- | -------------- | ------------ |
| 0→1   | 80px           | 20px         |
| 1→2   | 60px           | 16px         |
| 2→3   | 50px           | 14px         |
| 3+    | 40px           | 12px         |

### 3.2 Collapsible Button

**Trigger hiển thị:**

- Node có ≥1 child
- Hover vào node → show button ở cạnh phải

**UI:**

```
[Node Text] [▶]  ← collapsed
[Node Text] [▼]  ← expanded
```

**Behavior:**

- Click toggle collapse/expand
- Collapsed: ẩn tất cả children, show badge số lượng `(3)`
- Double-click node = toggle collapse

### 3.3 Rebalance Strategy

**Khi nào rebalance:**

- Sau khi thêm/xóa node
- Sau khi expand collapsed branch
- Manual trigger (button hoặc shortcut)

**Nguyên tắc:**

- Animate transition 200ms ease-out
- Giữ node đang focus ở vị trí ổn định (anchor point)
- Batch updates để tránh layout "nhảy"

### 3.4 Layout Modes (Future)

| Mode     | Mô tả                              |
| -------- | ---------------------------------- |
| Auto     | Tự động spacing theo depth         |
| Compact  | Rút ngắn gap, phù hợp tree lớn     |
| Balanced | Distribute đều theo vertical space |

---

## 4. Implementation Priority

### Phase 1 (MVP) ✅

- [x] Chuẩn hóa Enter/Tab/Esc behavior
- [x] Draft node với auto-delete khi rỗng
- [x] Backspace delete node rỗng

### Phase 2 ✅

- [x] Collapse/Expand button
- [x] Badge hiển thị số children khi collapsed
- [x] Smooth transition animation

### Phase 3 ✅

- [x] Arrow key navigation
- [x] Shift+Tab promote
- [ ] Layout mode toggle

---

## 5. Edge Cases

| Case                    | Xử lý                                         |
| ----------------------- | --------------------------------------------- |
| Delete node có children | Confirm dialog hoặc merge children lên parent |
| Paste text có newline   | Tạo multiple sibling nodes                    |
| Undo/Redo               | Ctrl+Z / Ctrl+Shift+Z (future)                |
| Root node empty         | Không cho delete, set default "..."           |
