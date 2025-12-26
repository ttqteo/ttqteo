import { MindmapNode } from "./types";

/**
 * Converts a MindmapNode tree to Mermaid mindmap syntax
 *
 * @param node - The root node of the mindmap
 * @returns Mermaid mindmap code as string
 *
 * @example
 * const node = { id: "1", text: "Root", children: [{ id: "2", text: "Child", children: [] }] };
 * const code = treeToMermaid(node);
 * // Returns:
 * // mindmap
 * //   root((Root))
 * //     Child
 */
export function treeToMermaid(node: MindmapNode): string {
  let result = "mindmap\n";
  result += `  root((${escapeText(node.text)}))\n`;

  for (const child of node.children) {
    result += nodeToMermaid(child, 2);
  }

  return result;
}

/**
 * Recursively converts a node and its children to Mermaid syntax
 */
function nodeToMermaid(node: MindmapNode, level: number): string {
  const indent = "  ".repeat(level);
  let result = `${indent}${escapeText(node.text)}\n`;

  for (const child of node.children) {
    result += nodeToMermaid(child, level + 1);
  }

  return result;
}

/**
 * Escapes special characters in text for Mermaid syntax
 */
function escapeText(text: string): string {
  // Mermaid has issues with certain characters. Replace newlines with <br/> to keep single line structure.
  return text
    .replace(/\(/g, "［")
    .replace(/\)/g, "］")
    .replace(/\[/g, "〔")
    .replace(/\]/g, "〕")
    .replace(/\n/g, "<br/>");
}

/**
 * Parses Mermaid mindmap syntax back to a MindmapNode tree
 *
 * @param code - Mermaid mindmap code string
 * @returns Parsed MindmapNode tree or null if invalid
 */
export function parseMermaidToTree(code: string): MindmapNode | null {
  const lines = code.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return null;

  let rootNode: MindmapNode | null = null;
  const nodeStack: { node: MindmapNode; indent: number }[] = [];
  let idCounter = 0;

  // First pass: build tree structure
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "mindmap") continue;

    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Extract text (handle root((text)) syntax)
    let text = trimmed;
    const rootMatch = trimmed.match(/^root\(\((.+)\)\)$/);
    if (rootMatch) {
      text = unescapeText(rootMatch[1]);
    } else {
      text = unescapeText(text);
    }

    const newNode: MindmapNode = {
      id: `node-${idCounter++}`,
      text,
      children: [],
    };

    if (!rootNode) {
      rootNode = newNode;
      nodeStack.push({ node: newNode, indent });
    } else {
      // Find parent based on indentation
      while (
        nodeStack.length > 0 &&
        nodeStack[nodeStack.length - 1].indent >= indent
      ) {
        nodeStack.pop();
      }

      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].node.children.push(newNode);
      }
      nodeStack.push({ node: newNode, indent });
    }
  }

  // Second pass: Infer semantic types
  if (rootNode) {
    inferSemanticTypesRecursive(rootNode, 0, null);
  }

  return rootNode;
}

/**
 * Infers and assigns semantic types to the node and its children
 */
export function inferSemanticTypesRecursive(
  node: MindmapNode,
  depth: number,
  parent: MindmapNode | null
) {
  node.semanticType = inferSemanticType(node, depth, parent);

  for (const child of node.children) {
    inferSemanticTypesRecursive(child, depth + 1, node);
  }
}

/**
 * Determines the semantic type of a node based on context and keywords
 */
export function inferSemanticType(
  node: MindmapNode,
  depth: number,
  parent: MindmapNode | null
): import("./types").SemanticType {
  // 1. Root is always Root
  if (depth === 0) return "Root";

  // 2. Check node content for self-contained types (highest priority)
  const textLower = node.text.toLowerCase();

  if (
    node.text.startsWith("!") ||
    textLower.includes("warning") ||
    textLower.startsWith("cảnh báo")
  ) {
    return "Warning";
  }

  // Check if this node ITSELF is a section header
  if (
    ["ghi chú", "notes", "detail", "lưu ý"].some((k) =>
      textLower.includes(k)
    ) ||
    ["ví dụ", "examples", "ex", "vd"].some((k) => textLower.includes(k))
  ) {
    return "Section";
  }

  // 3. Check special branch overrides from parent
  const parentText = parent?.text?.toLowerCase() || "";

  // Helper to check keywords
  const hasKeyword = (text: string, keywords: string[]) =>
    keywords.some((k) => text.includes(k));

  if (hasKeyword(parentText, ["notes", "ghi chú", "details", "note"])) {
    return "Explanation";
  }

  if (hasKeyword(parentText, ["examples", "ví dụ", "e.g.", "vd", "example"])) {
    return "Example";
  }

  if (
    hasKeyword(parentText, [
      "warnings",
      "lưu ý",
      "caution",
      "cảnh báo",
      "warning",
    ])
  ) {
    return "Warning";
  }

  // 4. Default by depth
  if (depth === 1) return "Concept";

  // 5. Default fallback
  return "Idea";
}

/**
 * Unescapes special characters from Mermaid syntax
 */
function unescapeText(text: string): string {
  return text
    .replace(/［/g, "(")
    .replace(/］/g, ")")
    .replace(/〔/g, "[")
    .replace(/〕/g, "]")
    .replace(/<br\s*\/?>/gi, "\n");
}

/**
 * Generates a unique ID for new nodes
 */
export function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clones a MindmapNode tree
 */
export function cloneTree(node: MindmapNode): MindmapNode {
  return {
    id: node.id,
    text: node.text,
    children: node.children.map(cloneTree),
    isDraft: node.isDraft,
    isCollapsed: node.isCollapsed,
  };
}

/**
 * Finds a node by ID in the tree
 */
export function findNodeById(
  root: MindmapNode,
  id: string
): MindmapNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Finds the parent of a node by ID
 */
export function findParentById(
  root: MindmapNode,
  id: string,
  parent: MindmapNode | null = null
): MindmapNode | null {
  if (root.id === id) return parent;
  for (const child of root.children) {
    const found = findParentById(child, id, root);
    if (found) return found;
  }
  return null;
}
