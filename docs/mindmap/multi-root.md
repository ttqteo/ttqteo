# Multi-Root Support - Hỗ Trợ Đa Gốc

## Tổng Quan

Mindmap hỗ trợ nhiều root node độc lập trong cùng một file. Điều này cho phép bạn tổ chức nhiều chủ đề riêng biệt mà không cần tạo nhiều file.

---

## 1. Cấu Trúc Dữ Liệu

```typescript
interface MindmapItem {
  id: string;
  name: string;
  trees: MindmapNode[]; // Mảng các root nodes
  // ...
}
```

### Trước đây (Single Root)

```typescript
tree: MindmapNode; // Một root duy nhất
```

### Hiện tại (Multi-Root)

```typescript
trees: MindmapNode[]  // Nhiều roots độc lập
```

---

## 2. Cách Tạo Root Mới

### Cách 1: Radial Context Menu

1. Right-click vào canvas
2. Chọn icon **Plus (+)** - "Add Root"
3. Root mới được tạo và tự động vào chế độ edit

### Cách 2: Promote Node (Shift + Tab)

1. Chọn một child node của root
2. Nhấn `Shift + Tab`
3. Node được thăng cấp thành root mới

---

## 3. Mermaid Syntax

### Multiple Roots

```mermaid
mindmap
  root1((Chủ Đề 1))
    Nhánh A
    Nhánh B

mindmap
  root2((Chủ Đề 2))
    Nhánh C
    Nhánh D
```

### Parsing

Hệ thống tự động nhận diện nhiều block `mindmap` và parse thành mảng `trees[]`.

---

## 4. Layout

Các root được sắp xếp **theo chiều dọc** với khoảng cách lớn giữa chúng:

```
┌─────────────┐
│   Root 1    │
│  └─ Child   │
│  └─ Child   │
└─────────────┘
       ↓
    (gap)
       ↓
┌─────────────┐
│   Root 2    │
│  └─ Child   │
└─────────────┘
```

---

## 5. Center View

Khi có nhiều roots, **Center View** sẽ tính toán bounding box của TẤT CẢ các roots và căn giữa toàn bộ.

---

## 6. Migration

Dữ liệu cũ với `tree` đơn lẻ được tự động migrate sang `trees[]` khi load.

```javascript
// Migration logic
if (item.tree && !item.trees) {
  item.trees = [item.tree];
  delete item.tree;
}
```
