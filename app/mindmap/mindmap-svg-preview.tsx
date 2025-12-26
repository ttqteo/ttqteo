"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  BrainCircuit,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MindmapNode, SemanticType } from "./types";
import {
  generateNodeId,
  inferSemanticTypesRecursive,
  cloneTree,
} from "./mermaid-converter";
import { MindmapHelpModal } from "./help-modal";
import { MindmapTips } from "./tips";

interface MindmapSvgPreviewProps {
  tree: MindmapNode;
  onTreeChange?: (newTree: MindmapNode) => void;
  isFullscreen?: boolean;
  className?: string;
}

// Color palette using HSL for dynamic generation
// Root node color (blue)
const ROOT_COLOR = { bg: "#3b82f6", text: "#ffffff", border: "#2563eb" };

/**
 * Generate branch colors dynamically using HSL
 * Each branch gets a unique hue, with primary (saturated) and secondary (lighter) variants
 */
function generateBranchColor(branchIndex: number): {
  primary: { bg: string; text: string; border: string };
  secondary: { bg: string; text: string; border: string };
} {
  // Golden angle (~137.5°) for optimal color distribution
  const hue = (branchIndex * 137.5 + 30) % 360; // Start at 30° (orange) to avoid blue (root)

  // Primary: saturated, medium lightness
  const primaryBg = `hsl(${hue}, 75%, 55%)`;
  const primaryBorder = `hsl(${hue}, 75%, 45%)`;
  const primaryText = hue > 45 && hue < 200 ? "#1f2937" : "#ffffff"; // Dark text for light hues

  // Secondary: less saturated, lighter
  const secondaryBg = `hsl(${hue}, 80%, 85%)`;
  const secondaryBorder = `hsl(${hue}, 70%, 75%)`;
  const secondaryText = "#1f2937";

  return {
    primary: { bg: primaryBg, text: primaryText, border: primaryBorder },
    secondary: {
      bg: secondaryBg,
      text: secondaryText,
      border: secondaryBorder,
    },
  };
}

interface NodeLayout {
  node: MindmapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  branchIndex: number; // Which branch from root this node belongs to
  children: NodeLayout[];
  parentId: string | null;
  nextSiblingId: string | null;
}

const NODE_MIN_HEIGHT = 36;
const NODE_MAX_WIDTH = 200;
const NODE_PADDING_X = 16;
const NODE_PADDING_Y = 8;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 16;
const BORDER_RADIUS = 8;
const CHAR_WIDTH = 8;
const LINE_HEIGHT = 20;

/**
 * Calculate node dimensions based on text
 */
function measureNode(text: string): { width: number; height: number } {
  const textWidth = text.length * CHAR_WIDTH;
  const width = Math.min(
    NODE_MAX_WIDTH,
    Math.max(60, textWidth + NODE_PADDING_X * 2)
  );

  // Calculate number of lines needed
  const charsPerLine = Math.floor((width - NODE_PADDING_X * 2) / CHAR_WIDTH);
  const lines = Math.ceil(text.length / charsPerLine) || 1;
  const height = Math.max(
    NODE_MIN_HEIGHT,
    lines * LINE_HEIGHT + NODE_PADDING_Y * 2
  );

  return { width, height };
}

/**
 * Calculate layout for the mindmap tree
 */
function calculateLayout(
  node: MindmapNode,
  level: number = 0,
  startY: number = 0,
  parentId: string | null = null,
  branchIndex: number = 0
): NodeLayout {
  const { width, height } = measureNode(node.text);

  if (node.children.length === 0) {
    return {
      node,
      x: 0,
      y: startY,
      width,
      height,
      level,
      branchIndex,
      children: [],
      parentId,
      nextSiblingId: null,
    };
  }

  // Calculate children layouts
  let currentY = startY;
  const childLayouts: NodeLayout[] = [];

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    // For root's children (level 0), each gets its own branch index
    // For deeper levels, inherit parent's branch index
    const childBranchIndex = level === 0 ? i : branchIndex;
    const childLayout = calculateLayout(
      child,
      level + 1,
      currentY,
      node.id,
      childBranchIndex
    );
    childLayouts.push(childLayout);
    currentY = getLayoutBottom(childLayout) + VERTICAL_GAP;
  }

  // Set next sibling IDs
  for (let i = 0; i < childLayouts.length; i++) {
    childLayouts[i].nextSiblingId =
      i < childLayouts.length - 1 ? childLayouts[i + 1].node.id : null;
  }

  // Calculate node Y position (center of children)
  const firstChild = childLayouts[0];
  const lastChild = childLayouts[childLayouts.length - 1];
  const childrenCenterY =
    (firstChild.y + lastChild.y + lastChild.height) / 2 - height / 2;

  return {
    node,
    x: 0,
    y: Math.max(startY, childrenCenterY),
    width,
    height,
    level,
    branchIndex,
    children: childLayouts,
    parentId,
    nextSiblingId: null,
  };
}

/**
 * Get the bottom Y coordinate of a layout including all children
 */
function getLayoutBottom(layout: NodeLayout): number {
  if (layout.children.length === 0) {
    return layout.y + layout.height;
  }
  return Math.max(
    layout.y + layout.height,
    ...layout.children.map(getLayoutBottom)
  );
}

/**
 * Position nodes horizontally based on level
 */
function positionHorizontally(layout: NodeLayout, x: number = 0): void {
  layout.x = x;
  const childX = x + layout.width + HORIZONTAL_GAP;
  for (const child of layout.children) {
    positionHorizontally(child, childX);
  }
}

/**
 * Get color for a node based on level and branch index
 */
function getNodeColor(
  level: number,
  branchIndex: number
): { bg: string; text: string; border: string } {
  if (level === 0) return ROOT_COLOR;

  const colorFamily = generateBranchColor(branchIndex);
  // Level 1 uses primary color, deeper levels use secondary
  return level === 1 ? colorFamily.primary : colorFamily.secondary;
}

/**
 * Get semantic style for a node based on type, depth, and mode
 */
function getSemanticStyle(
  type: SemanticType | undefined,
  level: number,
  mode: "brainstorm" | "study",
  baseColors: { bg: string; text: string; border: string }
) {
  // Default to Idea if undefined
  const semanticType = type || "Idea";

  const style = {
    hasBox: false,
    fontSize: 14,
    fontWeight: 400,
    opacity: 1,
    dashed: false,
    ...baseColors, // Inherit base colors by default
  };

  // 1. Determine Box Presence
  if (semanticType === "Root") {
    style.hasBox = true;
    style.fontSize = 18;
    style.fontWeight = 700;
  } else if (semanticType === "Warning") {
    style.hasBox = true;
    style.bg = "#fef3c7"; // Amber-100
    style.border = "#d97706"; // Amber-600
    style.text = "#92400e"; // Amber-800
    style.fontWeight = 500;
  } else if (mode === "study") {
    // Study Mode Rules
    if (semanticType === "Concept") {
      style.hasBox = true; // Box for concepts
      style.fontWeight = 600;
      style.fontSize = 16;
    } else if (semanticType === "Explanation") {
      style.fontSize = 12;
      style.text = "#6b7280"; // Gray-500
    } else if (semanticType === "Example") {
      style.fontSize = 12;
      style.dashed = true;
      style.text = "#4b5563"; // Gray-600
    }
  } else {
    // Brainstorm Mode Rules
    if (semanticType === "Concept") {
      style.hasBox = false; // key diff: no box for concepts
      style.fontWeight = 600;
      style.fontSize = 16;
    } else if (semanticType === "Explanation") {
      style.opacity = 0.7;
      style.fontSize = 13;
    } else if (semanticType === "Example") {
      style.opacity = 0.8;
      style.fontSize = 13;
    }
  }

  // Override for line-only nodes (no box)
  if (!style.hasBox) {
    style.bg = "transparent";
    style.border = "transparent";
    // Keep text color, or ensure it's visible on white/dark bg
    if (mode === "brainstorm" && level > 0) {
      // In brainstorm, maybe force standard text color for readability if transparent
      if (baseColors.text === "#ffffff") {
        // If original was white text (on dark bg), switch to dark text for transparent bg
        // But wait, generateBranchColor returns white text for saturated backgrounds.
        // If we remove bg, we must change text to dark.
        style.text = baseColors.border; // Use the border color (darker version of hue) for text
      }
    }
    // Similar for Study mode
    if (mode === "study" && !style.hasBox && baseColors.text === "#ffffff") {
      style.text = baseColors.border;
    }
  }

  return style;
}

/**
 * MindmapSvgPreview - Custom SVG renderer matching div-based editor design
 *
 * Keyboard shortcuts:
 * - Enter: Save and add sibling
 * - Tab: Save and add child
 * - Escape: Cancel editing
 */
export function MindmapSvgPreview({
  tree,
  onTreeChange,
  isFullscreen = false,
  className = "",
}: MindmapSvgPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Render Mode State
  const [renderMode, setRenderMode] = useState<"brainstorm" | "study">(
    "brainstorm"
  );

  // Process tree to add semantic types
  const processedTree = useMemo(() => {
    const t = cloneTree(tree);
    inferSemanticTypesRecursive(t, 0, null);
    return t;
  }, [tree]);

  const [layout, setLayout] = useState<NodeLayout | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 800, height: 400 });

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Editing state
  const [editingNode, setEditingNode] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    level: number;
    parentId: string | null;
    nextSiblingId: string | null;
    colors: { bg: string; text: string; border: string };
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Pending new node to focus
  const pendingEditRef = useRef<string | null>(null);

  // Calculate layout when tree changes
  useEffect(() => {
    // Start with top padding of 40px
    const newLayout = calculateLayout(processedTree, 0, 40);
    positionHorizontally(newLayout, 40);

    // Calculate SVG size
    let maxX = 0;
    let maxY = 0;

    const traverse = (l: NodeLayout) => {
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
      l.children.forEach(traverse);
    };
    traverse(newLayout);

    setLayout(newLayout);
    setSvgSize({
      width: maxX + 80,
      height: maxY + 80, // Extra bottom padding
    });

    // If there's a pending node to focus, find and edit it
    if (pendingEditRef.current) {
      const findNode = (
        l: NodeLayout
      ): {
        id: string;
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        level: number;
        parentId: string | null;
        nextSiblingId: string | null;
        colors: { bg: string; text: string; border: string };
      } | null => {
        if (l.node.id === pendingEditRef.current) {
          const colors = getNodeColor(l.level, l.branchIndex);
          return {
            id: l.node.id,
            text: l.node.text,
            x: l.x,
            y: l.y,
            width: l.width,
            height: l.height,
            level: l.level,
            parentId: l.parentId,
            nextSiblingId: l.nextSiblingId,
            colors,
          };
        }
        for (const child of l.children) {
          const found = findNode(child);
          if (found) return found;
        }
        return null;
      };

      const found = findNode(newLayout);
      if (found) {
        setEditingNode(found);
        setEditValue(found.text === "..." ? "" : found.text);
        pendingEditRef.current = null;
      }
    }
  }, [processedTree]);

  // Zoom with wheel - use native event for preventDefault to work
  useEffect(() => {
    const svgContainer = svgContainerRef.current;
    if (!svgContainer) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setScale((prev) => Math.min(Math.max(0.25, prev + delta), 3));
    };

    svgContainer.addEventListener("wheel", handleWheelNative, {
      passive: false,
    });
    return () => svgContainer.removeEventListener("wheel", handleWheelNative);
  }, [layout]); // Re-attach when layout changes

  // React handler (backup, may not prevent scroll due to passive)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev) => Math.min(Math.max(0.25, prev + delta), 3));
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingNode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNode]);

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeLayout: NodeLayout) => {
      if (onTreeChange) {
        const colors = getNodeColor(nodeLayout.level, nodeLayout.branchIndex);
        setEditingNode({
          id: nodeLayout.node.id,
          text: nodeLayout.node.text,
          x: nodeLayout.x,
          y: nodeLayout.y,
          width: nodeLayout.width,
          height: nodeLayout.height,
          level: nodeLayout.level,
          parentId: nodeLayout.parentId,
          nextSiblingId: nodeLayout.nextSiblingId,
          colors,
        });
        setEditValue(
          nodeLayout.node.text === "..." ? "" : nodeLayout.node.text
        );
      }
    },
    [onTreeChange]
  );

  // Update node text and optionally add child/sibling
  const updateAndAddNode = useCallback(
    (
      nodeId: string,
      newText: string,
      action: "none" | "addChild" | "addSibling"
    ) => {
      if (!onTreeChange) return;

      const newNodeId = generateNodeId();

      const processTree = (node: MindmapNode): MindmapNode => {
        if (node.id === nodeId) {
          const updatedNode = { ...node, text: newText, isDraft: false };
          if (action === "addChild") {
            return {
              ...updatedNode,
              children: [
                ...updatedNode.children,
                { id: newNodeId, text: "...", children: [], isDraft: true },
              ],
            };
          }
          return updatedNode;
        }

        // Check if this node's children contain the target (for addSibling)
        if (action === "addSibling") {
          const childIndex = node.children.findIndex((c) => c.id === nodeId);
          if (childIndex !== -1) {
            const newChildren = node.children.map((c) =>
              c.id === nodeId ? { ...c, text: newText, isDraft: false } : c
            );
            newChildren.splice(childIndex + 1, 0, {
              id: newNodeId,
              text: "...",
              children: [],
              isDraft: true,
            });
            return { ...node, children: newChildren };
          }
        }

        return { ...node, children: node.children.map(processTree) };
      };

      if (action !== "none") {
        pendingEditRef.current = newNodeId;
      }
      onTreeChange(processTree(tree));
    },
    [tree, onTreeChange]
  );

  // Delete a node
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!onTreeChange) return;

      const deleteFromTree = (node: MindmapNode): MindmapNode | null => {
        if (node.id === nodeId) {
          return null;
        }
        return {
          ...node,
          children: node.children
            .map(deleteFromTree)
            .filter((child): child is MindmapNode => child !== null),
        };
      };

      const updatedTree = deleteFromTree(tree);
      if (updatedTree) {
        onTreeChange(updatedTree);
      }
    },
    [tree, onTreeChange]
  );

  // Toggle collapse state of a node
  const toggleCollapse = useCallback(
    (nodeId: string) => {
      if (!onTreeChange) return;

      const toggleInTree = (node: MindmapNode): MindmapNode => {
        if (node.id === nodeId) {
          return { ...node, isCollapsed: !node.isCollapsed };
        }
        return { ...node, children: node.children.map(toggleInTree) };
      };

      onTreeChange(toggleInTree(tree));
    },
    [tree, onTreeChange]
  );

  // Promote node (move to become sibling of parent) - Shift+Tab
  const promoteNode = useCallback(
    (nodeId: string) => {
      if (!onTreeChange) return;

      // Find parent and grandparent
      const findParentPath = (
        node: MindmapNode,
        targetId: string,
        path: MindmapNode[] = []
      ): MindmapNode[] | null => {
        if (node.children.some((c) => c.id === targetId)) {
          return [...path, node];
        }
        for (const child of node.children) {
          const result = findParentPath(child, targetId, [...path, node]);
          if (result) return result;
        }
        return null;
      };

      const parentPath = findParentPath(tree, nodeId);
      if (!parentPath || parentPath.length < 2) {
        // Node is child of root or not found - cannot promote
        return;
      }

      const parent = parentPath[parentPath.length - 1];
      const grandparent = parentPath[parentPath.length - 2];
      const nodeToPromote = parent.children.find((c) => c.id === nodeId);
      if (!nodeToPromote) return;

      // Remove from parent, add as sibling after parent in grandparent
      const updateTree = (node: MindmapNode): MindmapNode => {
        if (node.id === grandparent.id) {
          const parentIndex = node.children.findIndex(
            (c) => c.id === parent.id
          );
          const newChildren = [...node.children];
          newChildren.splice(parentIndex + 1, 0, nodeToPromote);
          return {
            ...node,
            children: newChildren.map((c) =>
              c.id === parent.id
                ? {
                    ...c,
                    children: c.children.filter((cc) => cc.id !== nodeId),
                  }
                : c
            ),
          };
        }
        return { ...node, children: node.children.map(updateTree) };
      };

      onTreeChange(updateTree(tree));
    },
    [tree, onTreeChange]
  );

  // Handle edit save
  const handleEditSave = useCallback(() => {
    if (!editingNode) return;

    const textToSave =
      editValue.trim() || (editingNode.text !== "..." ? editingNode.text : "");

    if (textToSave) {
      updateAndAddNode(editingNode.id, textToSave, "none");
    } else if (editingNode.level > 0) {
      // Empty text on non-root node - delete it
      deleteNode(editingNode.id);
    }

    setEditingNode(null);
    setEditValue("");
  }, [editingNode, editValue, updateAndAddNode, deleteNode]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    if (!editingNode) return;

    // If it's a new node (text is "...") and empty, delete it
    if (editingNode.text === "..." && editValue.trim() === "") {
      deleteNode(editingNode.id);
    }

    setEditingNode(null);
    setEditValue("");
  }, [editingNode, editValue, deleteNode]);

  // Handle key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!editingNode) return;

      // Ignore events during IME composition (e.g., Vietnamese Telex)
      if (e.nativeEvent.isComposing) return;

      if (e.key === "Enter" && !e.shiftKey) {
        // Enter: Save and add sibling
        e.preventDefault();
        const textToSave =
          editValue.trim() ||
          (editingNode.text !== "..." ? editingNode.text : "");

        if (!textToSave && editingNode.level > 0) {
          // Empty - delete
          deleteNode(editingNode.id);
          setEditingNode(null);
          setEditValue("");
          return;
        }

        if (editingNode.nextSiblingId && layout) {
          // Has next sibling - save and move to it
          updateAndAddNode(editingNode.id, textToSave, "none");
          setEditingNode(null);
          setEditValue("");

          // Find and edit next sibling
          const findSibling = (l: NodeLayout): NodeLayout | null => {
            if (l.node.id === editingNode.nextSiblingId) return l;
            for (const child of l.children) {
              const found = findSibling(child);
              if (found) return found;
            }
            return null;
          };
          const sibling = findSibling(layout);
          if (sibling) {
            setTimeout(() => handleNodeClick(sibling), 50);
          }
        } else if (editingNode.level > 0) {
          // No next sibling and not root - save and add new sibling
          setEditingNode(null);
          setEditValue("");
          updateAndAddNode(editingNode.id, textToSave, "addSibling");
        } else {
          // Root node - just save
          updateAndAddNode(editingNode.id, textToSave, "none");
          setEditingNode(null);
          setEditValue("");
        }
      } else if (e.key === "Tab" && !e.shiftKey) {
        // Tab: Save and add child
        e.preventDefault();
        const textToSave =
          editValue.trim() ||
          (editingNode.text !== "..." ? editingNode.text : "");

        if (!textToSave && editingNode.level > 0) {
          // Empty - delete
          deleteNode(editingNode.id);
          setEditingNode(null);
          setEditValue("");
          return;
        }

        setEditingNode(null);
        setEditValue("");
        updateAndAddNode(editingNode.id, textToSave || "Node", "addChild");
      } else if (e.key === "Backspace" && editValue === "") {
        // Backspace on empty text - delete node and focus parent
        if (editingNode.level > 0) {
          e.preventDefault();
          deleteNode(editingNode.id);
          setEditingNode(null);
          setEditValue("");
          // Focus will return to parent via layout update
        }
        // Root node: do nothing, cannot delete
      } else if (e.key === "Tab" && e.shiftKey) {
        // Shift+Tab: Promote node (become sibling of parent)
        e.preventDefault();
        if (editingNode.level > 1) {
          // Save current text first
          const textToSave =
            editValue.trim() ||
            (editingNode.text !== "..." ? editingNode.text : "Node");
          updateAndAddNode(editingNode.id, textToSave, "none");
          promoteNode(editingNode.id);
        }
        setEditingNode(null);
        setEditValue("");
      } else if (e.key === "Escape") {
        // Escape: Cancel
        e.preventDefault();
        handleEditCancel();
      } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.altKey) {
        // Alt + Arrow Up/Down: Navigate to previous/next sibling
        e.preventDefault();
        if (!layout) return;

        // Find current node and its siblings
        const findNodeWithSiblings = (
          l: NodeLayout,
          parent: NodeLayout | null
        ): {
          node: NodeLayout;
          siblings: NodeLayout[];
          index: number;
        } | null => {
          if (l.node.id === editingNode.id && parent) {
            const index = parent.children.findIndex(
              (c) => c.node.id === editingNode.id
            );
            return { node: l, siblings: parent.children, index };
          }
          for (const child of l.children) {
            const result = findNodeWithSiblings(child, l);
            if (result) return result;
          }
          return null;
        };

        const result = findNodeWithSiblings(layout, null);
        if (result && result.siblings.length > 1) {
          const targetIndex =
            e.key === "ArrowUp"
              ? Math.max(0, result.index - 1)
              : Math.min(result.siblings.length - 1, result.index + 1);

          if (targetIndex !== result.index) {
            handleEditSave();
            setTimeout(() => handleNodeClick(result.siblings[targetIndex]), 50);
          }
        }
      } else if (e.key === "ArrowLeft" && e.altKey) {
        // Alt + Arrow Left: Navigate to parent
        e.preventDefault();
        if (editingNode.parentId && layout) {
          const findNode = (l: NodeLayout): NodeLayout | null => {
            if (l.node.id === editingNode.parentId) return l;
            for (const child of l.children) {
              const result = findNode(child);
              if (result) return result;
            }
            return null;
          };
          const parent = findNode(layout);
          if (parent) {
            handleEditSave();
            setTimeout(() => handleNodeClick(parent), 50);
          }
        }
      } else if (e.key === "ArrowRight" && e.altKey) {
        // Alt + Arrow Right: Navigate to first child
        e.preventDefault();
        if (!layout) return;

        const findNode = (l: NodeLayout): NodeLayout | null => {
          if (l.node.id === editingNode.id) return l;
          for (const child of l.children) {
            const result = findNode(child);
            if (result) return result;
          }
          return null;
        };
        const current = findNode(layout);
        if (current && current.children.length > 0) {
          handleEditSave();
          setTimeout(() => handleNodeClick(current.children[0]), 50);
        }
      }
    },
    [
      editingNode,
      editValue,
      updateAndAddNode,
      deleteNode,
      handleEditCancel,
      handleEditSave,
      promoteNode,
      layout,
      handleNodeClick,
    ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && !editingNode) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [position, editingNode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  }, []);

  // Render a node and its connections
  const renderNode = (nodeLayout: NodeLayout): React.ReactNode => {
    const { node, x, y, width, height, level, children } = nodeLayout;
    // Get base colors
    const baseColors = getNodeColor(level, nodeLayout.branchIndex);
    // Get semantic style
    const style = getSemanticStyle(
      node.semanticType,
      level,
      renderMode,
      baseColors
    );

    const isEditing = editingNode?.id === node.id;
    const hasChildren = node.children.length > 0;
    const isCollapsed = node.isCollapsed && hasChildren;

    // Only render visible children (not collapsed)
    const visibleChildren = isCollapsed ? [] : children;

    // Count total descendants for badge
    const countDescendants = (n: MindmapNode): number => {
      return n.children.reduce(
        (acc, child) => acc + 1 + countDescendants(child),
        0
      );
    };
    const descendantCount = countDescendants(node);

    return (
      <g key={node.id} style={{ opacity: style.opacity }}>
        {/* Connection lines to children */}
        {visibleChildren.map((child) => {
          // Determine styling for child
          const childBaseColors = getNodeColor(child.level, child.branchIndex);
          const childStyle = getSemanticStyle(
            child.node.semanticType,
            child.level,
            renderMode,
            childBaseColors
          );

          const startX = x + width;
          const startY = y + height / 2;

          let endX = child.x;
          let endY = child.y + child.height / 2; // Default for Box

          // If child has NO box (is line style), connect to bottom-left where underline starts
          // BUT we want it to look seamless, so we target the START of the underline.
          // The underline runs from (child.x, child.y + height) to (child.x + width, child.y + height)
          // Actually, let's target the left-middle still, but draw the curve to flatten out?
          // No, standard is: Parent -> (curve) -> Child Bottom Base.

          if (!childStyle.hasBox) {
            endY = child.y + child.height; // Bottom
            // Adjust endX slightly if needed? No, left edge is fine.
          }

          const midX = (startX + endX) / 2;

          return (
            <path
              key={`line-${node.id}-${child.node.id}`}
              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke={
                childStyle.hasBox
                  ? childStyle.border === "transparent"
                    ? childBaseColors.border
                    : childStyle.border
                  : childBaseColors.border
              }
              strokeWidth={level === 0 ? 3 : 2}
              opacity="0.6"
            />
          );
        })}

        {/* Node rectangle or Underline */}
        <g
          onClick={(e) => {
            e.stopPropagation();
            handleNodeClick(nodeLayout);
          }}
          style={{
            cursor: "pointer",
            transformOrigin: `${x + width / 2}px ${y + height / 2}px`,
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          className="mindmap-node hover:scale-110"
        >
          {/* Transparent Hit Area for reliable clicking */}
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="transparent"
            stroke="none"
          />

          {style.hasBox ? (
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={BORDER_RADIUS}
              ry={BORDER_RADIUS}
              fill={style.bg}
              stroke={style.border}
              strokeWidth="2"
              strokeDasharray={node.isDraft || style.dashed ? "4 2" : "none"}
              opacity={node.isDraft ? 0.7 : 1}
              style={{
                transition:
                  "filter 0.2s ease, stroke-width 0.2s ease, opacity 0.2s ease",
              }}
              className="hover:brightness-110"
            />
          ) : (
            // Render underline for boxless nodes
            <path
              d={`M ${x} ${y + height} L ${x + width} ${y + height}`}
              stroke={baseColors.border}
              strokeWidth="2"
              fill="none"
              opacity={0.8}
            />
          )}

          {/* Node text with wrapping */}
          {!isEditing && (
            <foreignObject
              x={x}
              y={y}
              width={width}
              height={height}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: `${NODE_PADDING_Y}px ${NODE_PADDING_X}px`,
                  fontSize: `${style.fontSize}px`,
                  fontWeight: style.fontWeight,
                  fontFamily: "inherit",
                  color: style.text,
                  textAlign: "center",
                  userSelect: "none",
                  wordBreak: "break-word",
                  lineHeight: "1.3",
                  overflow: "hidden",
                }}
              >
                {node.text === "..." ? ".." : node.text}
              </div>
            </foreignObject>
          )}
        </g>

        {/* Collapse/Expand button */}
        {hasChildren && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(node.id);
            }}
            style={{ cursor: "pointer" }}
            className="collapse-button"
          >
            <circle
              cx={x + width + 12}
              cy={y + height / 2}
              r={10}
              fill={baseColors.bg}
              stroke={baseColors.border}
              strokeWidth="1.5"
              className="hover:brightness-90"
            />
            <text
              x={x + width + 12}
              y={y + height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="12"
              fontWeight="bold"
              fill={baseColors.text}
              style={{ pointerEvents: "none" }}
            >
              {isCollapsed ? "+" : "−"}
            </text>
            {/* Badge showing descendant count when collapsed */}
            {isCollapsed && descendantCount > 0 && (
              <>
                <circle
                  cx={x + width + 22}
                  cy={y + height / 2 - 8}
                  r={8}
                  fill={baseColors.border}
                />
                <text
                  x={x + width + 22}
                  y={y + height / 2 - 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  fontWeight="bold"
                  fill="white"
                  style={{ pointerEvents: "none" }}
                >
                  {descendantCount}
                </text>
              </>
            )}
          </g>
        )}

        {/* Render children */}
        {visibleChildren.map(renderNode)}
      </g>
    );
  };

  if (!layout) {
    return (
      <div
        className={`flex items-center justify-center ${
          isFullscreen ? "h-full" : "min-h-[75vh]"
        } ${className}`}
      >
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${
        isFullscreen ? "h-full" : "min-h-[75vh]"
      } ${className}`}
      style={{
        touchAction: "none",
        overscrollBehavior: "contain",
      }}
    >
      {/* Zoom controls */}
      <div className="fixed bottom-4 right-4 flex gap-1 z-50">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-auto px-2 fs-xs bg-background/80 backdrop-blur-sm"
          onClick={() =>
            setRenderMode((m) => (m === "brainstorm" ? "study" : "brainstorm"))
          }
          title={`Switch to ${
            renderMode === "brainstorm" ? "Study" : "Brainstorm"
          } Mode`}
        >
          {renderMode === "brainstorm" ? (
            <BrainCircuit className="h-3.5 w-3.5" />
          ) : (
            <BookOpen className="h-3.5 w-3.5" />
          )}
          <span className="ml-1 text-xs">
            {renderMode === "brainstorm" ? "Thinking" : "Learning"}
          </span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={zoomIn}
          className="h-7 w-7 bg-background/80 backdrop-blur-sm"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={zoomOut}
          className="h-7 w-7 bg-background/80 backdrop-blur-sm"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={resetView}
          className="h-7 w-7 bg-background/80 backdrop-blur-sm"
          title="Reset view"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <span className="flex items-center px-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded border">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div className="fixed bottom-4 left-4 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border z-50 transition-all max-w-[90vw]">
        <MindmapHelpModal />
        <div className="w-px h-3 bg-border mx-1" />
        <MindmapTips />
      </div>

      {/* Edit input overlay */}
      {editingNode && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{
            left: editingNode.x * scale + position.x,
            top: editingNode.y * scale + position.y,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleEditSave}
            className="outline-none resize-none select-text"
            style={{
              width: Math.max(120, editingNode.width),
              height: editingNode.height,
              padding: `${NODE_PADDING_Y}px ${NODE_PADDING_X}px`,
              backgroundColor: editingNode.colors.bg,
              color: editingNode.colors.text,
              border: `2px solid ${editingNode.colors.border}`,
              borderRadius: `${BORDER_RADIUS}px`,
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.15), 0 0 0 3px rgba(59,130,246,0.3)",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "inherit",
              textAlign: "center",
              lineHeight: "1.3",
              overflow: "hidden",
            }}
          />
        </div>
      )}

      {/* SVG container with pan/zoom */}
      <div
        ref={svgContainerRef}
        className={`overflow-hidden border border-t-0 ${
          isFullscreen ? "h-full" : "min-h-[75vh]"
        } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={svgSize.width * scale}
          height={svgSize.height * scale}
          viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {renderNode(layout)}
        </svg>
      </div>
    </div>
  );
}
