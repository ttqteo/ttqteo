# Triết Lý Thiết Kế - Semantic Mindmap Rendering

## 1. Mindmap Không Phải Đồ Thị Thông Thường

### Đặc điểm cấu trúc

Mindmap có cấu trúc **tỏa** (radial) với đặc điểm:

- **Một gốc duy nhất** - không phải multi-root graph
- **Phân cấp nhận thức** - depth = mức độ chi tiết
- **Hướng đọc tự nhiên** - từ trung tâm ra ngoài

### Khác biệt với đồ thị

| Đặc điểm | Đồ thị thông thường | Mindmap              |
| -------- | ------------------- | -------------------- |
| Cấu trúc | Tùy ý               | Cây tỏa từ gốc       |
| Hướng    | Đa hướng            | Trung tâm → ngoại vi |
| Mục đích | Mô hình hóa quan hệ | Tổ chức tư duy       |
| Node     | Đồng đẳng           | Có vai trò nhận thức |

---

## 2. Ba Trường Hợp Sử Dụng

### A. Thinking (Tư duy / Brainstorm)

**Mục tiêu:** Mở rộng ý tưởng, khám phá không gian vấn đề

**Đặc điểm:**

- Tốc độ là ưu tiên
- Không cần phân loại ngay
- Cấu trúc linh hoạt, có thể tái tổ chức sau

**Nhu cầu render:**

- Tối thiểu "nhiễu" trực quan
- Không cần nhấn mạnh bất kỳ node nào
- Dễ thêm/xóa node

### B. Learning (Học tập / Study Notes)

**Mục tiêu:** Ghi nhớ, ôn tập, nắm bắt kiến thức

**Đặc điểm:**

- Có cấu trúc rõ ràng
- Phân biệt: khái niệm chính vs chi tiết hỗ trợ
- Một số node **cần nhớ**, số khác chỉ là ngữ cảnh

**Nhu cầu render:**

- Nhấn mạnh các khái niệm quan trọng (hộp)
- Giảm nhấn chi tiết phụ (chỉ đường)
- Hỗ trợ ôn tập spaced repetition

### C. System Design (Thiết kế hệ thống)

**Mục tiêu:** Mô hình hóa kiến trúc, luồng dữ liệu

**Đặc điểm:**

- Cần chính xác về cấu trúc
- Có các loại node khác nhau (component, service, data)
- Quan hệ giữa các node quan trọng

**Nhu cầu render:**

- Phân biệt loại node bằng hình dạng
- Màu sắc theo category
- Có thể cần icon/emoji

---

## 3. Nguyên Tắc Cốt Lõi

> **"Vai trò ngữ nghĩa > Hình dạng trực quan"**

### Giải thích

Người dùng **KHÔNG** chọn hình dạng. Hệ thống **TỰ ĐỘNG** gán style dựa trên:

1. **Vị trí trong cây** (depth, là gốc hay lá)
2. **Ngữ cảnh cha** (nằm dưới nhánh "Notes" hay "Examples")
3. **Chế độ render** (Brainstorm hay Study)

### Lý do

| Cách tiếp cận                | Vấn đề                                |
| ---------------------------- | ------------------------------------- |
| Cho chọn hình dạng           | Tốn thời gian, phân tâm khỏi nội dung |
| Tự động theo cú pháp Mermaid | Mermaid syntax ≠ ngữ nghĩa mindmap    |
| **Tự động theo ngữ nghĩa**   | ✅ Nhanh, nhất quán, có ý nghĩa       |

### Hệ quả

- Mermaid chỉ là **định dạng lưu trữ**, không phải hướng dẫn render
- Cùng một file Mermaid có thể render khác nhau tùy chế độ
- Style phản ánh **ý định nhận thức**, không phải thẩm mỹ cá nhân

---

## 4. Mục Tiêu Thiết Kế

1. **Cognitive Load thấp** - Không cần quyết định về hình thức
2. **Nhất quán** - Cùng loại node = cùng style
3. **Có ý nghĩa** - Style truyền tải thông tin về vai trò
4. **Linh hoạt** - Có thể chuyển đổi giữa các chế độ render
5. **Mở rộng được** - Dễ thêm loại node và chế độ mới
