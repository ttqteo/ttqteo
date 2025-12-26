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
  // Mermaid has issues with certain characters
  return text
    .replace(/\(/g, "［")
    .replace(/\)/g, "］")
    .replace(/\[/g, "〔")
    .replace(/\]/g, "〕");
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

  return rootNode;
}

/**
 * Unescapes special characters from Mermaid syntax
 */
function unescapeText(text: string): string {
  return text
    .replace(/［/g, "(")
    .replace(/］/g, ")")
    .replace(/〔/g, "[")
    .replace(/〕/g, "]");
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
