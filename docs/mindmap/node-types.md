# Các Loại Node - Semantic Node Types

## Tổng Quan

Mỗi node trong mindmap được gán một **loại ngữ nghĩa** (semantic type) dựa trên:

- Vị trí trong cây (depth)
- Ngữ cảnh cha (parent context)
- Chế độ render hiện tại

---

## 1. Root (Gốc)

### Mục đích nhận thức

- Chủ đề trung tâm của toàn bộ mindmap
- Điểm neo cho tất cả các ý tưởng khác
- Luôn hiển thị, không bao giờ ẩn

### Đặc điểm render

| Thuộc tính     | Giá trị        |
| -------------- | -------------- |
| **Có hộp**     | ✅ Luôn luôn   |
| **Hình dạng**  | Tròn hoặc oval |
| **Cần nhớ**    | ✅ Có          |
| **Độ nổi bật** | Cao nhất       |

### Quy tắc xác định

```
isRoot = (depth === 0)
```

---

## 2. Concept (Khái niệm)

### Mục đích nhận thức

- Ý tưởng chính, nhánh cấp 1
- Điểm phân chia logic của chủ đề
- **Cần ghi nhớ** khi học

### Đặc điểm render

| Thuộc tính     | Giá trị               |
| -------------- | --------------------- |
| **Có hộp**     | ✅ Trong chế độ Study |
| **Hình dạng**  | Chữ nhật bo góc       |
| **Cần nhớ**    | ✅ Có                 |
| **Độ nổi bật** | Cao                   |

### Quy tắc xác định

```
isConcept = (depth === 1)
         || (node được promote thủ công)
```

---

## 3. Idea (Ý tưởng)

### Mục đích nhận thức

- Ý hỗ trợ cho Concept
- Chi tiết mở rộng
- Có thể quan trọng hoặc không tùy ngữ cảnh

### Đặc điểm render

| Thuộc tính     | Giá trị                           |
| -------------- | --------------------------------- |
| **Có hộp**     | ❌ Mặc định không / ⚪ Tùy chế độ |
| **Hình dạng**  | Chỉ text + đường kẻ               |
| **Cần nhớ**    | ❌ Không (mặc định)               |
| **Độ nổi bật** | Trung bình                        |

### Quy tắc xác định

```
isIdea = (depth >= 2)
      && !isSpecialBranch(parent)
```

---

## 4. Explanation (Giải thích)

### Mục đích nhận thức

- Cung cấp ngữ cảnh, không phải ý chính
- Giúp hiểu, nhưng không cần nhớ
- Thường nằm dưới nhánh "Notes" hoặc "Ghi chú"

### Đặc điểm render

| Thuộc tính     | Giá trị            |
| -------------- | ------------------ |
| **Có hộp**     | ❌ Không bao giờ   |
| **Hình dạng**  | Text nhỏ, màu nhạt |
| **Cần nhớ**    | ❌ Không           |
| **Độ nổi bật** | Thấp               |

### Quy tắc xác định

```
isExplanation = parent.text ∈ {"Notes", "Ghi chú", "Details"}
```

---

## 5. Example (Ví dụ)

### Mục đích nhận thức

- Minh họa cụ thể cho khái niệm
- Giúp hiểu qua trường hợp thực tế
- Hỗ trợ, không phải nội dung chính

### Đặc điểm render

| Thuộc tính     | Giá trị                      |
| -------------- | ---------------------------- |
| **Có hộp**     | ❌ Không (hoặc viền đứt)     |
| **Hình dạng**  | Text nghiêng hoặc có icon 📌 |
| **Cần nhớ**    | ❌ Không                     |
| **Độ nổi bật** | Thấp-Trung bình              |

### Quy tắc xác định

```
isExample = parent.text ∈ {"Examples", "Ví dụ", "E.g."}
```

---

## 6. Warning (Cảnh báo / Lưu ý)

### Mục đích nhận thức

- Điểm dễ nhầm lẫn
- Lỗi thường gặp
- **Phải nhớ** để tránh sai lầm

### Đặc điểm render

| Thuộc tính     | Giá trị                   |
| -------------- | ------------------------- |
| **Có hộp**     | ✅ Luôn có (màu đặc biệt) |
| **Hình dạng**  | Hộp với viền cảnh báo     |
| **Cần nhớ**    | ✅ Có                     |
| **Độ nổi bật** | Cao (màu vàng/cam)        |

### Quy tắc xác định

```
isWarning = parent.text ∈ {"Warnings", "Lưu ý", "Caution", "⚠️"}
         || node.text.startsWith("⚠️")
```

---

## Bảng Tổng Hợp

| Loại        | Depth mặc định | Có hộp    | Cần nhớ | Màu                 |
| ----------- | -------------- | --------- | ------- | ------------------- |
| Root        | 0              | ✅ Luôn   | ✅      | Primary             |
| Concept     | 1              | ✅ Study  | ✅      | Branch color        |
| Idea        | 2+             | ❌ / ⚪   | ❌      | Branch color (nhạt) |
| Explanation | 2+             | ❌        | ❌      | Gray                |
| Example     | 2+             | ❌ / viền | ❌      | Blue-gray           |
| Warning     | 2+             | ✅ Luôn   | ✅      | Orange/Yellow       |

---

## Mở Rộng Trong Tương Lai

Các loại node có thể thêm:

- **Question** - câu hỏi cần trả lời
- **Definition** - định nghĩa thuật ngữ
- **Reference** - link đến tài liệu khác
- **Action** - việc cần làm (TODO)
