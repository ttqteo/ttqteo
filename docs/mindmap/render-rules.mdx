# Quy Tắc Render - Semantic Render Rules

## 1. Quy Tắc Hộp (Box Rules)

### Khi Nào PHẢI Có Hộp

```
hasBox = TRUE khi:
  - node.type === "Root"
  - node.type === "Warning"
  - (node.type === "Concept") && (mode === "Study")
```

### Khi Nào KHÔNG Được Có Hộp

```
hasBox = FALSE khi:
  - node.type === "Explanation"
  - node.type === "Example" && !isHighlighted
  - (node.type === "Idea") && (mode === "Brainstorm")
```

### Trường Hợp Tùy Chọn

```
hasBox = OPTIONAL khi:
  - (node.type === "Idea") && (mode === "Study")
    → có thể có hộp mỏng/nhạt
  - node được promote thủ công
```

---

## 2. Quy Tắc Theo Độ Sâu (Depth-Based Rules)

### Font Size

```javascript
function getFontSize(depth) {
  const baseSizes = {
    0: 18, // Root
    1: 16, // Concept
    2: 14, // Idea
    3: 13, // Deep idea
  };
  return baseSizes[Math.min(depth, 3)] || 12;
}
```

### Line Thickness (Đường nối)

```javascript
function getLineThickness(depth) {
  const thicknesses = {
    0: 3, // Root → Concept
    1: 2.5, // Concept → Idea
    2: 2, // Idea → Deeper
    3: 1.5,
  };
  return thicknesses[Math.min(depth, 3)] || 1;
}
```

### Color Intensity (Cường độ màu)

```javascript
function getColorIntensity(depth, baseColor) {
  // HSL lightness tăng theo depth
  const lightness = {
    0: 0, // Màu gốc
    1: 10, // Nhạt hơn 10%
    2: 20, // Nhạt hơn 20%
    3: 30, // Nhạt hơn 30%
  };
  return adjustLightness(baseColor, lightness[depth] || 40);
}
```

---

## 3. Quy Tắc Thăng Cấp (Promotion Rules)

### Idea → Concept

Một Idea có thể được **thăng cấp** thành Concept khi:

```
shouldPromote = TRUE khi:
  - Idea có >= 3 children
  - Idea được user đánh dấu thủ công (future feature)
  - Idea chứa keyword quan trọng (e.g., "Định nghĩa", "Khái niệm")
```

### Tác động của Promotion

```javascript
if (shouldPromote(node)) {
  node.semanticType = "Concept";
  node.style = getConceptStyle(mode);
  // Thay đổi: có hộp, font lớn hơn, màu đậm hơn
}
```

---

## 4. Semantic Mapping Layer

### Thuật Toán Suy Luận Loại Node

```javascript
function inferSemanticType(node, depth, parent) {
  // 1. Root luôn là Root
  if (depth === 0) return "Root";

  // 2. Check special branch overrides
  const parentText = parent?.text?.toLowerCase() || "";

  if (matchesKeywords(parentText, ["notes", "ghi chú", "details"])) {
    return "Explanation";
  }

  if (matchesKeywords(parentText, ["examples", "ví dụ", "e.g."])) {
    return "Example";
  }

  if (matchesKeywords(parentText, ["warnings", "lưu ý", "caution", "⚠️"])) {
    return "Warning";
  }

  // 3. Check node content for warning indicators
  if (node.text.startsWith("⚠️") || node.text.startsWith("!")) {
    return "Warning";
  }

  // 4. Default by depth
  if (depth === 1) return "Concept";

  // 5. Check promotion rules
  if (shouldPromote(node)) return "Concept";

  // 6. Default
  return "Idea";
}
```

### Từ Khóa Nhánh Đặc Biệt

| Nhánh    | Loại con    | Từ khóa hỗ trợ                                   |
| -------- | ----------- | ------------------------------------------------ |
| Notes    | Explanation | "notes", "ghi chú", "details", "chi tiết"        |
| Examples | Example     | "examples", "ví dụ", "e.g.", "vd"                |
| Warnings | Warning     | "warnings", "lưu ý", "caution", "cảnh báo", "⚠️" |

---

## 5. Pseudocode Renderer Hoàn Chỉnh

```javascript
// Main render function
function renderMindmap(tree, mode) {
  const layout = calculateLayout(tree);
  return renderNode(tree, 0, null, mode);
}

// Render single node
function renderNode(node, depth, parent, mode) {
  // Step 1: Infer semantic type
  const semanticType = inferSemanticType(node, depth, parent);

  // Step 2: Get visual style based on type + mode
  const style = getStyle(semanticType, depth, mode);

  // Step 3: Create visual element
  const element = {
    id: node.id,
    text: node.text,
    semanticType: semanticType,

    // Visual properties
    hasBox: style.hasBox,
    boxShape: style.boxShape,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    textColor: style.textColor,

    // Line to parent
    lineThickness: getLineThickness(depth),
    lineColor: style.lineColor,
  };

  // Step 4: Render children recursively
  const children = node.children.map((child) =>
    renderNode(child, depth + 1, node, mode)
  );

  return { element, children };
}

// Get style based on semantic type and mode
function getStyle(semanticType, depth, mode) {
  const baseStyles = {
    Root: {
      hasBox: true,
      boxShape: "rounded",
      fontSize: 18,
      fontWeight: "bold",
      // ... colors from theme
    },
    Concept: {
      hasBox: mode === "Study",
      boxShape: "rectangle",
      fontSize: 16,
      fontWeight: "semibold",
    },
    Idea: {
      hasBox: false,
      fontSize: 14,
      fontWeight: "normal",
    },
    Explanation: {
      hasBox: false,
      fontSize: 13,
      fontWeight: "normal",
      textColor: "gray",
    },
    Example: {
      hasBox: false,
      fontSize: 13,
      fontStyle: "italic",
      textColor: "blue-gray",
    },
    Warning: {
      hasBox: true,
      boxShape: "rectangle",
      fontSize: 14,
      fontWeight: "medium",
      backgroundColor: "amber-light",
      borderColor: "amber",
    },
  };

  return {
    ...baseStyles[semanticType],
    ...getDepthModifiers(depth),
  };
}
```

---

## 6. Ưu Tiên Áp Dụng Quy Tắc

Khi có xung đột, áp dụng theo thứ tự:

1. **Override thủ công** (nếu có trong tương lai)
2. **Nhánh đặc biệt** (Notes, Examples, Warnings)
3. **Nội dung node** (emoji ⚠️, prefix !)
4. **Promotion rules** (>= 3 children)
5. **Depth mặc định**
