"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MindmapNode } from "./types";
import { generateNodeId } from "./mermaid-converter";

interface MindmapSvgPreviewProps {
  tree: MindmapNode;
  onTreeChange?: (newTree: MindmapNode) => void;
  isFullscreen?: boolean;
  className?: string;
}

// Color palette matching the div-based editor
const LEVEL_COLORS = [
  { bg: "#3b82f6", text: "#ffffff", border: "#2563eb" }, // blue-500 (Root)
  { bg: "#fbbf24", text: "#1f2937", border: "#f59e0b" }, // amber-400
  { bg: "#34d399", text: "#1f2937", border: "#10b981" }, // emerald-400
  { bg: "#fb7185", text: "#1f2937", border: "#f43f5e" }, // rose-400
  { bg: "#a78bfa", text: "#ffffff", border: "#8b5cf6" }, // purple-400
  { bg: "#22d3d8", text: "#1f2937", border: "#06b6d4" }, // cyan-400
];

const CHILD_COLORS = [
  { bg: "#fde68a", text: "#1f2937", border: "#fcd34d" }, // amber-200
  { bg: "#a7f3d0", text: "#1f2937", border: "#6ee7b7" }, // emerald-200
  { bg: "#fecdd3", text: "#1f2937", border: "#fda4af" }, // rose-200
  { bg: "#ddd6fe", text: "#1f2937", border: "#c4b5fd" }, // purple-200
  { bg: "#a5f3fc", text: "#1f2937", border: "#67e8f9" }, // cyan-200
];

interface NodeLayout {
  node: MindmapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
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
  parentId: string | null = null
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
    const childLayout = calculateLayout(child, level + 1, currentY, node.id);
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
 * Get color for a node based on level and whether it has children
 */
function getNodeColor(
  level: number,
  hasChildren: boolean
): (typeof LEVEL_COLORS)[0] {
  if (level === 0) return LEVEL_COLORS[0];

  const colorIndex = Math.min(level, LEVEL_COLORS.length - 1);
  if (hasChildren) {
    return LEVEL_COLORS[colorIndex];
  }
  return CHILD_COLORS[colorIndex % CHILD_COLORS.length];
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
    const newLayout = calculateLayout(tree, 0, 40);
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
          const colors = getNodeColor(l.level, l.node.children.length > 0);
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
  }, [tree]);

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
        const colors = getNodeColor(
          nodeLayout.level,
          nodeLayout.node.children.length > 0
        );
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
          const updatedNode = { ...node, text: newText };
          if (action === "addChild") {
            return {
              ...updatedNode,
              children: [
                ...updatedNode.children,
                { id: newNodeId, text: "...", children: [] },
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
              c.id === nodeId ? { ...c, text: newText } : c
            );
            newChildren.splice(childIndex + 1, 0, {
              id: newNodeId,
              text: "...",
              children: [],
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
      } else if (e.key === "Tab") {
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
      } else if (e.key === "Escape") {
        // Escape: Cancel
        e.preventDefault();
        handleEditCancel();
      }
    },
    [
      editingNode,
      editValue,
      updateAndAddNode,
      deleteNode,
      handleEditCancel,
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
    const colors = getNodeColor(level, node.children.length > 0);
    const isEditing = editingNode?.id === node.id;

    return (
      <g key={node.id}>
        {/* Connection lines to children */}
        {children.map((child) => {
          const startX = x + width;
          const startY = y + height / 2;
          const endX = child.x;
          const endY = child.y + child.height / 2;
          const midX = (startX + endX) / 2;

          return (
            <path
              key={`line-${node.id}-${child.node.id}`}
              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke={colors.border}
              strokeWidth="2"
              opacity="0.6"
            />
          );
        })}

        {/* Node rectangle */}
        <g
          onClick={() => handleNodeClick(nodeLayout)}
          style={{
            cursor: "pointer",
            transformOrigin: `${x + width / 2}px ${y + height / 2}px`,
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          className="mindmap-node hover:scale-110"
        >
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={BORDER_RADIUS}
            ry={BORDER_RADIUS}
            fill={colors.bg}
            stroke={colors.border}
            strokeWidth="2"
            style={{
              transition: "filter 0.2s ease, stroke-width 0.2s ease",
            }}
            className="hover:brightness-110"
          />
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
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  color: colors.text,
                  textAlign: "center",
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

        {/* Render children */}
        {children.map(renderNode)}
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
      className={`relative overflow-hidden ${
        isFullscreen ? "h-full" : "min-h-[75vh]"
      } ${className}`}
      style={{
        touchAction: "none",
        overscrollBehavior: "contain",
      }}
    >
      {/* Zoom controls */}
      <div className="absolute top-2 left-2 flex gap-1 z-10">
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

      {/* Hint */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border z-10">
        <Move className="h-3 w-3" />
        Click to edit •{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> =
        sibling •{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Tab</kbd> =
        child • Scroll = zoom
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
            className="px-3 py-2 border-2 rounded-lg shadow-lg text-sm font-medium outline-none resize-none"
            style={{
              width: Math.max(180, editingNode.width + 30),
              minHeight: Math.max(NODE_MIN_HEIGHT, editingNode.height),
              maxHeight: 150,
              backgroundColor: editingNode.colors.bg,
              color: editingNode.colors.text,
              borderColor: editingNode.colors.border,
            }}
            rows={Math.max(1, Math.ceil(editValue.length / 20))}
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
