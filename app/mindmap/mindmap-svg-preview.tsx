"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Brain,
  Check,
  ExternalLinkIcon,
  Focus,
  GraduationCap,
  Layout,
  MessageSquare,
  Plus,
  RotateCcw,
  Trash,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cloneTree,
  generateNodeId,
  inferSemanticTypesRecursive,
} from "./mermaid-converter";
import { MindmapNode, SemanticType } from "./types";

interface MindmapSvgPreviewProps {
  trees: MindmapNode[];
  onTreesChange?: (newTrees: MindmapNode[]) => void;
  isFullscreen?: boolean;
  className?: string;
  renderMode?: "brainstorm" | "study" | "classic";
  onModeChange?: (mode: "brainstorm" | "study" | "classic") => void;
}

// Color palette using HSL for dynamic generation
// Root node color (blue)
const ROOT_COLOR = { bg: "#3b82f6", text: "#ffffff", border: "#2563eb" };

/**
 * Generate branch colors dynamically using HSL
 * Each branch gets a unique hue, with primary (saturated) and secondary (lighter) variants
 */
function generateBranchColor(
  branchIndex: number,
  isDark: boolean
): {
  primary: { bg: string; text: string; border: string };
  secondary: { bg: string; text: string; border: string };
} {
  // Golden angle (~137.5°) for optimal color distribution
  const hue = (branchIndex * 137.5 + 30) % 360;

  // Primary: saturated
  // Reduce lightness in dark mode to prevent glare ("chói")
  const primaryLightness = isDark ? 45 : 55;
  const primaryBg = `hsl(${hue}, 75%, ${primaryLightness}%)`;
  const primaryBorder = `hsl(${hue}, 75%, ${primaryLightness - 10}%)`;

  // Text contrast: use dark text for bright hues (Yellow, Green, Cyan)
  // These hues (approx 45-190) are naturally very bright at 45-55% lightness
  const isBrightHue = hue > 45 && hue < 195;
  const primaryText = isBrightHue ? "#0f172a" : "#ffffff";

  // Secondary: less saturated
  const secondaryBg = isDark
    ? `hsl(${hue}, 40%, 12%)`
    : `hsl(${hue}, 80%, 85%)`;
  const secondaryBorder = isDark
    ? `hsl(${hue}, 50%, 20%)`
    : `hsl(${hue}, 70%, 75%)`;
  const secondaryText = isDark ? "#f1f5f9" : "#1f2937";

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
  treeIndex: number; // Index in the trees array
  children: NodeLayout[];
  parentId: string | null;
  nextSiblingId: string | null;
}

const NODE_MIN_HEIGHT = 28; // Reduced
const NODE_MAX_WIDTH = 220; // Slightly wider to compensate for less padding waste
const NODE_PADDING_X = 12; // Reduced from 16
const NODE_PADDING_Y = 4; // Reduced from 6
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 12; // Reduced from 16
const BORDER_RADIUS = 8;
const LINE_HEIGHT = 20;

/**
 * Check if text is a valid URL
 */
function isUrl(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Calculate node dimensions based on text and font size
function measureNode(
  text: string,
  fontSize: number = 14
): { width: number; height: number } {
  if (typeof text !== "string") return { width: 64, height: 28 };

  // Vietnamese characters with diacritics are "tall" and "wide"
  const AVG_CHAR_WIDTH = fontSize * 0.65;
  const SAFE_CHAR_WIDTH = fontSize * 0.65;
  const LINE_HEIGHT_MEASURE = fontSize * 1.45; // Generous factor for Vietnamese diacritics

  // Split by newline first
  const sourceLines = text.split("\n");

  // 1. Calculate Width based on Average
  let maxContentWidth = 0;
  for (const line of sourceLines) {
    maxContentWidth = Math.max(maxContentWidth, line.length * AVG_CHAR_WIDTH);
  }

  const width = Math.min(
    NODE_MAX_WIDTH,
    Math.max(64, maxContentWidth + NODE_PADDING_X * 2)
  );

  // 2. Calculate Height based on Final Width
  const availableWidth = width - NODE_PADDING_X * 2;
  const charsPerLine = Math.max(
    1,
    Math.floor(availableWidth / SAFE_CHAR_WIDTH)
  );

  let totalLines = 0;
  for (const line of sourceLines) {
    if (!line.trim()) {
      totalLines += 1;
      continue;
    }
    // Simulate word wrapping
    const words = line.split(/\s+/);
    let currentLineLength = 0;
    let linesForThisSourceLine = 1;

    for (const word of words) {
      const wordLen = word.length;
      if (currentLineLength + wordLen > charsPerLine) {
        // If word itself is longer than line, split it
        if (wordLen > charsPerLine) {
          linesForThisSourceLine += Math.floor(wordLen / charsPerLine);
          currentLineLength = wordLen % charsPerLine;
        } else {
          linesForThisSourceLine++;
          currentLineLength = wordLen;
        }
      } else {
        currentLineLength += wordLen + 1; // +1 for space
      }
    }
    totalLines += linesForThisSourceLine;
  }

  const finalHeight = Math.max(
    NODE_MIN_HEIGHT,
    totalLines * LINE_HEIGHT_MEASURE + NODE_PADDING_Y * 2 + 12
  );

  // Safeguard against NaN or Infinity
  const safeWidth = isFinite(width) ? width : 200;
  const safeHeight = isFinite(finalHeight) ? finalHeight : 40;

  return { width: safeWidth, height: safeHeight };
}

/**
 * Calculate layout for the mindmap tree
 */
function calculateLayout(
  node: MindmapNode,
  level: number = 0,
  startY: number = 0,
  parentId: string | null = null,
  treeIndex: number = 0,
  branchIndex: number = 0
): NodeLayout {
  // Determine font size for measurement
  let fontSize = 14;
  if (node.semanticType === "Root") fontSize = 18;
  else if (node.semanticType === "Concept") fontSize = 16;
  else if (node.semanticType === "Section") fontSize = 13;

  const { width, height } = measureNode(node.text, fontSize);

  if (node.children.length === 0 || node.isCollapsed) {
    return {
      node,
      x: 0,
      y: startY,
      width,
      height,
      level,
      branchIndex,
      treeIndex,
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
      treeIndex, // Pass treeIndex to all children
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
    treeIndex,
    children: childLayouts,
    parentId,
    nextSiblingId: null,
  };
}

/**
 * Get the bottom Y coordinate of a layout including all children
 */
function getLayoutBottom(layout: NodeLayout): number {
  if (layout.children.length === 0 || layout.node.isCollapsed) {
    const bottom = layout.y + layout.height;
    return isFinite(bottom) ? bottom : layout.y + 40;
  }
  const bottom = Math.max(
    layout.y + layout.height,
    ...layout.children.map(getLayoutBottom)
  );
  return isFinite(bottom) ? bottom : layout.y + 100;
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
  branchIndex: number,
  isDark: boolean
): { bg: string; text: string; border: string } {
  if (level === 0) return ROOT_COLOR;

  const colorFamily = generateBranchColor(branchIndex, isDark);
  // Level 1 uses primary color, deeper levels use secondary
  return level === 1 ? colorFamily.primary : colorFamily.secondary;
}

/**
 * Get semantic style for a node based on type, depth, and mode
 */
function getSemanticStyle(
  type: SemanticType | undefined,
  level: number,
  mode: "brainstorm" | "study" | "classic",
  baseColors: { bg: string; text: string; border: string },
  isDark: boolean
) {
  // Default to Idea if undefined
  const semanticType = type || "Idea";

  const style = {
    hasBox: false,
    fontSize: 14,
    fontWeight: 500,
    opacity: 1,
    dashed: false,
    textShadow: "none",
    ...baseColors, // Inherit base colors by default
  };

  // 1. Determine Box Presence
  if (semanticType === "Root") {
    style.hasBox = true;
    style.fontSize = 18;
    style.fontWeight = 700;
  } else if (semanticType === "Warning") {
    style.hasBox = true;
    style.bg = isDark ? "#451a03" : "#fef3c7"; // Amber-950 / Amber-100
    style.border = isDark ? "#b45309" : "#d97706"; // Amber-700 / Amber-600
    style.text = isDark ? "#fcd34d" : "#92400e"; // Amber-300 / Amber-800
    style.fontWeight = 500;
  } else if (mode === "classic") {
    // Classic Mode: All nodes have boxes
    style.hasBox = true;
  } else if (mode === "study") {
    // Study Mode Rules
    if (semanticType === "Concept") {
      style.hasBox = true; // Box for concepts
      style.fontWeight = 600;
      style.fontSize = 16;
    } else if (semanticType === "Explanation") {
      style.fontSize = 14;
      style.text = isDark ? "#9ca3af" : "#6b7280"; // Gray-400 / Gray-500
    } else if (semanticType === "Example") {
      style.fontSize = 14;
      style.dashed = true;
      style.text = isDark ? "#d1d5db" : "#4b5563"; // Gray-300 / Gray-600
    }
  } else {
    // Brainstorm Mode Rules
    // Special Section Styling
    if (semanticType === "Section") {
      style.text = isDark ? "#fbbf24" : "#b45309"; // Amber for sections
      style.fontWeight = 700;
      style.fontSize = 13; // Moved from original position
    } else if (semanticType === "Concept") {
      // Original brainstorm concept rule
      style.hasBox = false; // key diff: no box for concepts
      style.fontWeight = 600;
      style.fontSize = 16;
    } else if (semanticType === "Explanation") {
      // Original brainstorm explanation rule
      style.opacity = 0.9;
      style.fontSize = 13;
      style.text = isDark ? "#9ca3af" : style.text;
    } else if (semanticType === "Example") {
      style.opacity = 0.9;
      style.fontSize = 13;
      style.text = isDark ? "#d1d5db" : style.text;
    }
  }

  // Override for line-only nodes (no box)
  if (!style.hasBox) {
    style.bg = "transparent";
    style.border = "transparent";

    // In brainstorm/study modes, if background is transparent,
    // we must ensure text color has contrast with the main background.
    if (isDark) {
      // In Dark Mode, we need Light text.
      // If the node's text color was set to dark (#0f172a / #1f2937) for a box,
      // or if it's the very dark secondary background (12% lightness), switch it.
      const isDarkText =
        style.text === "#0f172a" ||
        style.text === "#1f2937" ||
        style.text.includes("12%)");

      if (isDarkText || level > 0) {
        // For nodes without a box, we use the branch's hue but ensure it's bright enough
        if (baseColors.bg.startsWith("hsl")) {
          // Identify the current lightness in the HSL string (e.g., 45% or 12%)
          // and replace it with a consistent bright 70% for text readability
          style.text = baseColors.bg.replace(/,\s*\d+%\)/, ", 70%)");
        } else {
          // Fallback if not HSL
          style.text = baseColors.bg;
        }
      }
    } else {
      // In Light Mode, we need Dark text.
      if (style.text === "#ffffff") {
        style.text = baseColors.border; // Usually a darker version
      }
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
  trees,
  onTreesChange,
  isFullscreen = false,
  className = "",
  renderMode: controlledRenderMode,
  onModeChange,
}: MindmapSvgPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme, theme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Render mode state (Brainstorm vs Study vs Classic)
  const [localRenderMode, setLocalRenderMode] = useState<
    "brainstorm" | "study" | "classic"
  >("brainstorm");

  const renderMode = controlledRenderMode || localRenderMode;
  const setRenderMode = onModeChange || setLocalRenderMode;

  // Load saved render mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("mindmap-render-mode");
      if (
        savedMode === "brainstorm" ||
        savedMode === "study" ||
        savedMode === "classic"
      ) {
        setRenderMode(savedMode);
      }
    }
  }, []);

  // Save render mode (wrapped setter or effect)
  const handleSetRenderMode = useCallback(
    (
      mode:
        | "brainstorm"
        | "study"
        | "classic"
        | ((
            prev: "brainstorm" | "study" | "classic"
          ) => "brainstorm" | "study" | "classic")
    ) => {
      const next = typeof mode === "function" ? mode(renderMode) : mode;

      if (onModeChange) {
        onModeChange(next);
      } else {
        setLocalRenderMode(next);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("mindmap-render-mode", next);
      }
    },
    [renderMode, onModeChange]
  );

  const [layout, setLayout] = useState<NodeLayout | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 800, height: 400 });

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mini map state
  const [showMiniMap, setShowMiniMap] = useState(true);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const MINI_MAP_WIDTH = 160;
  const MINI_MAP_HEIGHT = 100;
  const MINI_MAP_PADDING = 8;
  const MINI_MAP_INNER_WIDTH = MINI_MAP_WIDTH - MINI_MAP_PADDING * 2;
  const MINI_MAP_INNER_HEIGHT = MINI_MAP_HEIGHT - MINI_MAP_PADDING * 2;

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
    treeIndex: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isNoteVisible, setIsNoteVisible] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Pending new node to focus
  const pendingEditRef = useRef<string | null>(null);

  // Radial Menu State
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const [radialMenuPos, setRadialMenuPos] = useState({ x: 0, y: 0 });
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Undo/Redo History State
  const MAX_HISTORY = 50;
  const historyRef = useRef<MindmapNode[][]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  // Track tree changes for undo/redo
  useEffect(() => {
    // Skip if this change came from undo/redo
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Skip if trees haven't actually changed (deep compare would be expensive, so just check reference)
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;

    // If we're in the middle of history, truncate future states
    if (currentIndex < currentHistory.length - 1) {
      historyRef.current = currentHistory.slice(0, currentIndex + 1);
    }

    // Add current state to history
    historyRef.current = [
      ...historyRef.current,
      JSON.parse(JSON.stringify(trees)),
    ];

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }

    historyIndexRef.current = historyRef.current.length - 1;
  }, [trees]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0 && onTreesChange) {
      isUndoRedoRef.current = true;
      historyIndexRef.current -= 1;
      const previousState = historyRef.current[historyIndexRef.current];
      onTreesChange(JSON.parse(JSON.stringify(previousState)));
    }
  }, [onTreesChange]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (
      historyIndexRef.current < historyRef.current.length - 1 &&
      onTreesChange
    ) {
      isUndoRedoRef.current = true;
      historyIndexRef.current += 1;
      const nextState = historyRef.current[historyIndexRef.current];
      onTreesChange(JSON.parse(JSON.stringify(nextState)));
    }
  }, [onTreesChange]);

  // Calculate layout when tree changes
  const rootLayouts = useMemo(() => {
    let currentY = 40; // Start with top padding
    const ROOT_GAP = 200; // Large gap between independent trees
    const layouts: NodeLayout[] = [];

    for (let i = 0; i < trees.length; i++) {
      const processedTree = cloneTree(trees[i]);
      inferSemanticTypesRecursive(processedTree, 0, null);
      const layout = calculateLayout(processedTree, 0, currentY, null, i, 0);
      positionHorizontally(layout, 40); // Start with left padding
      layouts.push(layout);
      currentY = getLayoutBottom(layout) + ROOT_GAP;
    }
    return layouts;
  }, [trees]);

  const handleTreeChange = useCallback(
    (index: number, newTree: MindmapNode) => {
      if (onTreesChange) {
        const newTrees = [...trees];
        newTrees[index] = newTree;
        onTreesChange(newTrees);
      }
    },
    [trees, onTreesChange]
  );

  // Add a brand new root node
  const handleAddNewRoot = useCallback(() => {
    const newId = generateNodeId();
    const newRoot: MindmapNode = {
      id: newId,
      text: "New Root",
      children: [],
    };
    if (onTreesChange) {
      onTreesChange([...trees, newRoot]);
      // Use ref to trigger focus in useEffect
      pendingEditRef.current = newId;
    }
  }, [trees, onTreesChange]);

  // Flattened list of all nodes across all trees for rendering
  const allNodes = useMemo(() => {
    const flat: NodeLayout[] = [];
    function flatten(layout: NodeLayout) {
      flat.push(layout);
      for (const child of layout.children) flatten(child);
    }
    rootLayouts.forEach(flatten);
    return flat;
  }, [rootLayouts]);

  useEffect(() => {
    // Calculate SVG size based on all root layouts
    let maxX = 0;
    let maxY = 0;

    const traverse = (l: NodeLayout) => {
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
      l.children.forEach(traverse);
    };
    rootLayouts.forEach(traverse);

    // Set the first layout as the main 'layout' for existing logic that expects a single layout
    setLayout(rootLayouts.length > 0 ? rootLayouts[0] : null);
    const safeWidth = isFinite(maxX) ? maxX + 120 : 1000;
    const safeHeight = isFinite(maxY) ? maxY + 120 : 1000;
    setSvgSize({
      width: safeWidth,
      height: safeHeight,
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
        treeIndex: number;
      } | null => {
        if (l.node.id === pendingEditRef.current) {
          const colors = getNodeColor(l.level, l.branchIndex, isDark);
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
            treeIndex: l.treeIndex,
          };
        }
        for (const child of l.children) {
          const found = findNode(child);
          if (found) return found;
        }
        return null;
      };

      let found = null;
      for (const l of rootLayouts) {
        found = findNode(l);
        if (found) break;
      }
      if (found) {
        setEditingNode(found);
        setEditValue(found.text === "..." ? "" : found.text);
        setEditNote(""); // New nodes have no note initially
        setIsNoteVisible(false); // Hide note for auto-focused new nodes
        pendingEditRef.current = null;
      }
    }
  }, [rootLayouts, isDark]);

  // Fit view to container
  const fitToView = useCallback(() => {
    if (rootLayouts.length === 0 || !containerRef.current) return;
    const { offsetWidth, offsetHeight } = containerRef.current;
    if (offsetWidth === 0 || offsetHeight === 0) return;

    const contentWidth = svgSize.width;
    const contentHeight = svgSize.height;

    // Calculate scale to fit with padding
    const padding = 60;
    const scaleX = (offsetWidth - padding * 2) / contentWidth;
    const scaleY = (offsetHeight - padding * 2) / contentHeight;
    const newScale = Math.min(Math.max(0.1, Math.min(scaleX, scaleY)), 1.2);

    setScale(isNaN(newScale) ? 1 : newScale);
    setPosition({
      x: isFinite((offsetWidth - contentWidth * newScale) / 2)
        ? (offsetWidth - contentWidth * newScale) / 2
        : 0,
      y: isFinite((offsetHeight - contentHeight * newScale) / 2)
        ? (offsetHeight - contentHeight * newScale) / 2
        : 0,
    });
  }, [rootLayouts, svgSize]);

  // Perform initial fit on load
  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (layout && !hasInitialFit.current) {
      setTimeout(() => {
        fitToView();
        hasInitialFit.current = true;
      }, 100);
    }
  }, [layout, fitToView]);

  // Refit on fullscreen toggle (always useful)
  useEffect(() => {
    if (layout) {
      fitToView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  // Zoom/Pan with wheel - use native event for preventDefault to work
  // Ctrl+wheel = zoom, 2-finger scroll (no Ctrl) = pan
  useEffect(() => {
    const svgContainer = svgContainerRef.current;
    if (!svgContainer) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Pinch to zoom (Ctrl/Cmd + wheel)
        const zoomSensitivity = 0.003;
        const delta = -e.deltaY * zoomSensitivity;
        const clampedDelta = Math.max(-0.2, Math.min(0.2, delta));

        const rect = svgContainer.getBoundingClientRect();
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;

        setScale((prev) => {
          const newScale = Math.min(
            Math.max(0.25, prev + prev * clampedDelta),
            3
          );
          const actualDelta = newScale - prev;
          if (Math.abs(actualDelta) < 0.001) return prev;

          const scaleRatio = newScale / prev;

          setPosition((pos) => ({
            x: mX - (mX - pos.x) * scaleRatio,
            y: mY - (mY - pos.y) * scaleRatio,
          }));

          return newScale;
        });
      } else if (e.shiftKey) {
        // Shift + Vertical Scroll = Horizontal Pan
        setPosition((prev) => ({
          x: prev.x - e.deltaY - e.deltaX,
          y: prev.y,
        }));
      } else {
        // 2-finger pan or normal scroll
        setPosition((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    svgContainer.addEventListener("wheel", handleWheelNative, {
      passive: false,
    });
    return () => svgContainer.removeEventListener("wheel", handleWheelNative);
  }, [layout]); // Re-attach when layout changes

  // Global keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Skip if we're editing a node (let the input handle it)
      if (editingNode) return;

      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [editingNode, handleUndo, handleRedo]);

  // Right-click radial menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (editingNode) return; // Don't show while editing

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;

      setRadialMenuPos({ x: newX, y: newY });
      setShowRadialMenu(true);
    },
    [editingNode]
  );

  const closeRadialMenu = useCallback(() => {
    setShowRadialMenu(false);
  }, []);

  // React handler (backup, may not prevent scroll due to passive)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.003;
      const delta = -e.deltaY * zoomSensitivity;
      const clampedDelta = Math.max(-0.2, Math.min(0.2, delta));

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mX = e.clientX - rect.left;
      const mY = e.clientY - rect.top;

      setScale((prev) => {
        const newScale = Math.min(
          Math.max(0.25, prev + prev * clampedDelta),
          3
        );
        const actualDelta = newScale - prev;
        if (Math.abs(actualDelta) < 0.001) return prev;

        const scaleRatio = newScale / prev;

        setPosition((pos) => ({
          x: mX - (mX - pos.x) * scaleRatio,
          y: mY - (mY - pos.y) * scaleRatio,
        }));

        return newScale;
      });
    } else if (e.shiftKey) {
      // Shift + Vertical Scroll = Horizontal Pan
      setPosition((prev) => ({
        x: prev.x - e.deltaY - e.deltaX,
        y: prev.y,
      }));
    } else {
      setPosition((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingNode && inputRef.current) {
      inputRef.current.focus();
      // selection for textarea
      if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      } else {
        // selection for contenteditable div
        const range = document.createRange();
        range.selectNodeContents(inputRef.current);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, [editingNode]);

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeLayout: NodeLayout) => {
      if (onTreesChange) {
        const colors = getNodeColor(
          nodeLayout.level,
          nodeLayout.branchIndex,
          isDark
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
          treeIndex: nodeLayout.treeIndex,
        });
        setEditValue(
          nodeLayout.node.text === "..." ? "" : nodeLayout.node.text
        );
        setEditNote(nodeLayout.node.note || "");
        setIsNoteVisible(true); // Show note when explicitly clicking a node

        // Auto-zoom to focus on the node
        if (containerRef.current) {
          const { offsetWidth, offsetHeight } = containerRef.current;
          const targetScale = 1.2;
          const finalScale = Math.max(scale, targetScale);

          setScale(finalScale);

          const nodeCenterX = nodeLayout.x + nodeLayout.width / 2;
          const nodeCenterY = nodeLayout.y + nodeLayout.height / 2;

          setPosition({
            x: offsetWidth / 2 - nodeCenterX * finalScale,
            y: offsetHeight / 2 - nodeCenterY * finalScale,
          });
        }
      }
    },
    [onTreesChange, isDark, scale]
  );

  // Update node text and optionally add child/sibling
  const updateAndAddNode = useCallback(
    (
      nodeId: string,
      newText: string,
      action: "none" | "addChild" | "addSibling",
      newNote?: string
    ) => {
      if (!onTreesChange || !editingNode) return;

      const newNodeId = generateNodeId();
      const treeIdx = editingNode.treeIndex;

      const processNode = (node: MindmapNode): MindmapNode => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            text: newText,
            isDraft: false,
            note: newNote !== undefined ? newNote : node.note,
          };
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

        return { ...node, children: node.children.map(processNode) };
      };

      if (action !== "none") {
        pendingEditRef.current = newNodeId;
      }

      // Check if we're adding a sibling to root node
      if (action === "addSibling" && trees[treeIdx].id === nodeId) {
        const newTrees = [...trees];
        newTrees[treeIdx] = {
          ...newTrees[treeIdx],
          text: newText,
          isDraft: false,
        };
        newTrees.splice(treeIdx + 1, 0, {
          id: newNodeId,
          text: "...",
          children: [],
          isDraft: true,
        });
        onTreesChange(newTrees);
        return;
      }

      const newTrees = [...trees];
      newTrees[treeIdx] = processNode(newTrees[treeIdx]);
      onTreesChange(newTrees);
    },
    [trees, onTreesChange, editingNode]
  );

  // Delete a node
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!onTreesChange) return;

      const deleteFromTree = (node: MindmapNode): MindmapNode | null => {
        if (node.id === nodeId) return null;
        return {
          ...node,
          children: node.children
            .map(deleteFromTree)
            .filter((child): child is MindmapNode => child !== null),
        };
      };

      // Check if it's a root node
      const rootIndex = trees.findIndex((t) => t.id === nodeId);
      if (rootIndex !== -1) {
        if (trees.length > 1) {
          onTreesChange(trees.filter((t) => t.id !== nodeId));
        } else {
          onTreesChange([{ id: generateNodeId(), text: "...", children: [] }]);
        }
        return;
      }

      onTreesChange(
        trees.map(deleteFromTree).filter((t): t is MindmapNode => t !== null)
      );
    },
    [trees, onTreesChange]
  );

  // Toggle collapse state of a node
  const toggleCollapse = useCallback(
    (nodeId: string) => {
      if (!onTreesChange) return;

      const toggleInTree = (node: MindmapNode): MindmapNode => {
        if (node.id === nodeId) {
          return { ...node, isCollapsed: !node.isCollapsed };
        }
        return { ...node, children: node.children.map(toggleInTree) };
      };

      onTreesChange(trees.map(toggleInTree));
    },
    [trees, onTreesChange]
  );

  // Promote node (move to become sibling of parent) - Shift+Tab
  const promoteNode = useCallback(
    (nodeId: string) => {
      if (!onTreesChange) return;

      // Find which tree and parent path
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

      let treeIdx = -1;
      let parentPath: MindmapNode[] | null = null;

      for (let i = 0; i < trees.length; i++) {
        parentPath = findParentPath(trees[i], nodeId);
        if (parentPath) {
          treeIdx = i;
          break;
        }
      }

      if (!parentPath || parentPath.length < 1) return;

      const parent = parentPath[parentPath.length - 1];
      const nodeToPromote = parent.children.find((c) => c.id === nodeId);
      if (!nodeToPromote) return;

      if (parentPath.length === 1) {
        // Child of root: promote to new root
        const newTrees = [...trees];
        // Remove from parent (which is a root)
        newTrees[treeIdx] = {
          ...newTrees[treeIdx],
          children: newTrees[treeIdx].children.filter((c) => c.id !== nodeId),
        };
        // Add as new root after the current one
        newTrees.splice(treeIdx + 1, 0, nodeToPromote);
        onTreesChange(newTrees);
        return;
      }

      const grandparent = parentPath[parentPath.length - 2];

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

      const finalTrees = [...trees];
      finalTrees[treeIdx] = updateTree(finalTrees[treeIdx]);
      onTreesChange(finalTrees);
    },
    [trees, onTreesChange]
  );

  // Handle edit save
  const handleEditSave = useCallback(() => {
    if (!editingNode || !onTreesChange) return;

    const currentEditingNode = editingNode;
    const currentEditValue = editValue;
    const currentEditNote = editNote;

    const textToSave =
      currentEditValue.trim() ||
      (currentEditingNode.text !== "..." ? currentEditingNode.text : "");

    // Clear editing state first
    setEditingNode(null);
    setEditValue("");
    setEditNote("");

    if (textToSave) {
      // Inline the update logic to avoid dependency issues
      const treeIdx = currentEditingNode.treeIndex;
      const processNode = (node: MindmapNode): MindmapNode => {
        if (node.id === currentEditingNode.id) {
          return {
            ...node,
            text: textToSave,
            isDraft: false,
            note: currentEditNote !== undefined ? currentEditNote : node.note,
          };
        }
        return { ...node, children: node.children.map(processNode) };
      };

      const newTrees = [...trees];
      newTrees[treeIdx] = processNode(newTrees[treeIdx]);
      onTreesChange(newTrees);
    } else if (currentEditingNode.level > 0) {
      // Empty text on non-root node - delete it
      deleteNode(currentEditingNode.id);
    }
  }, [editingNode, editValue, editNote, trees, onTreesChange, deleteNode]);

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
        // Enter: Save and add new sibling below (unless Ctrl/Cmd is pressed)
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

        const isCtrlDown = e.ctrlKey || e.metaKey;

        if (isCtrlDown) {
          // Ctrl+Enter: Just save and close
          handleEditSave();
        } else if (editingNode.level > 0) {
          // Not root - save and add new sibling below
          const idToUpdate = editingNode.id;
          updateAndAddNode(idToUpdate, textToSave, "addSibling");
          setEditingNode(null);
          setEditValue("");
        } else {
          // Root node - just save
          handleEditSave();
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

        const idToUpdate = editingNode.id;
        updateAndAddNode(idToUpdate, textToSave || "Node", "addChild");
        setEditingNode(null);
        setEditValue("");
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
      } else if (e.key.toLowerCase() === "n" && e.altKey) {
        // Alt + N: Jump to Note
        e.preventDefault();
        setIsNoteVisible(true);
        setTimeout(() => noteInputRef.current?.focus(), 50);
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
      // Close editing when clicking on background (not on a node)
      if (editingNode) {
        // Check if we clicked on a node or the background
        const target = e.target as HTMLElement;
        const isNode = target.closest(".mindmap-node");
        if (!isNode) {
          handleEditSave();
        }
      }

      if (e.button === 0 && !editingNode) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [position, editingNode, handleEditSave]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Track mouse position relative to container
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }

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

  const zoomIn = useCallback(
    (origin?: { x: number; y: number }) => {
      setScale((prev) => {
        const newScale = Math.min(prev + 0.25, 3);
        const scaleRatio = newScale / prev;
        const targetOrigin = origin || mousePosition;

        // Adjust position to keep target point stationary
        setPosition((pos) => ({
          x: targetOrigin.x - (targetOrigin.x - pos.x) * scaleRatio,
          y: targetOrigin.y - (targetOrigin.y - pos.y) * scaleRatio,
        }));

        return newScale;
      });
    },
    [mousePosition]
  );

  const zoomOut = useCallback(
    (origin?: { x: number; y: number }) => {
      setScale((prev) => {
        const newScale = Math.max(prev - 0.25, 0.25);
        const scaleRatio = newScale / prev;
        const targetOrigin = origin || mousePosition;

        // Adjust position to keep target point stationary
        setPosition((pos) => ({
          x: targetOrigin.x - (targetOrigin.x - pos.x) * scaleRatio,
          y: targetOrigin.y - (targetOrigin.y - pos.y) * scaleRatio,
        }));

        return newScale;
      });
    },
    [mousePosition]
  );

  // Mini map click handler - navigate to clicked position
  const handleMiniMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !miniMapRef.current) return;

      const rect = miniMapRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Calculate scale factor for mini map
      const miniMapScale = Math.min(
        MINI_MAP_WIDTH / svgSize.width,
        MINI_MAP_HEIGHT / svgSize.height
      );

      // Convert mini map click to SVG coordinates
      const svgX = clickX / miniMapScale;
      const svgY = clickY / miniMapScale;

      // Get container dimensions
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;

      // Center viewport on clicked position
      setPosition({
        x: containerWidth / 2 - svgX * scale,
        y: containerHeight / 2 - svgY * scale,
      });
    },
    [svgSize, scale]
  );

  // Render a node and its connections
  const renderNode = (nodeLayout: NodeLayout): React.ReactNode => {
    const { node, x, y, width, height, level, children } = nodeLayout;
    // Get base colors
    const baseColors = getNodeColor(level, nodeLayout.branchIndex, isDark);
    // Get semantic style
    const style = getSemanticStyle(
      node.semanticType,
      level,
      renderMode,
      baseColors,
      isDark
    );

    const isEditing = editingNode?.id === node.id;

    // Recalculate dimensions if editing (to handle dynamic text changes)
    let finalWidth = width;
    let finalHeight = height;
    if (isEditing && editValue) {
      // Pass correct font size for root/section etc
      const editDimensions = measureNode(editValue, style.fontSize);
      finalWidth = Math.max(width, editDimensions.width);
      finalHeight = Math.max(height, editDimensions.height);
    }

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
      <g
        key={node.id}
        style={{
          opacity: style.opacity,
          transition: isDragging
            ? "none"
            : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
          transform: `translate(0, 0)`, // Placeholder to enable transform transitions
        }}
      >
        {/* Connection lines to children */}
        {visibleChildren.map((child) => {
          // Determine styling for child
          const childBaseColors = getNodeColor(
            child.level,
            child.branchIndex,
            isDark
          );
          const childStyle = getSemanticStyle(
            child.node.semanticType,
            child.level,
            renderMode,
            childBaseColors,
            isDark
          );

          // Start point: if current node has no box, start from bottom-right (underline end)
          const startX = x + width;
          const startY = style.hasBox ? y + height / 2 : y + height;

          let endX = child.x;
          let endY = child.y + child.height / 2; // Default for Box

          // If child has NO box (is line style), connect to bottom-left where underline starts
          if (!childStyle.hasBox) {
            endY = child.y + child.height; // Bottom
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
              style={{
                transition: isDragging
                  ? "none"
                  : "d 0.3s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease",
              }}
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
            transition: "filter 0.2s ease, opacity 0.2s ease",
          }}
          className="group mindmap-node hover:brightness-110 hover:drop-shadow-lg pointer-events-auto"
        >
          {/* Transparent Hit Area for reliable clicking */}
          <rect
            x={x}
            y={y}
            width={finalWidth}
            height={finalHeight}
            fill="transparent"
            stroke="none"
          />
          {/* Always render solid background when editing to prevent overlap */}
          {isEditing && (
            <rect
              x={x}
              y={y}
              width={finalWidth}
              height={finalHeight}
              rx={BORDER_RADIUS}
              ry={BORDER_RADIUS}
              fill={isDark ? "#1a1a1a" : "#ffffff"}
              stroke={style.border}
              strokeWidth="2"
            />
          )}

          {style.hasBox && !isEditing ? (
            <rect
              x={x}
              y={y}
              width={finalWidth}
              height={finalHeight}
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
          ) : !isEditing ? (
            // Render underline for boxless nodes with hover background
            <>
              {/* Hover background - covers full text area */}
              <rect
                x={x - 4}
                y={y}
                width={width + 8}
                height={height + 4}
                rx={4}
                ry={4}
                fill={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                opacity={0}
                style={{
                  transition: "opacity 0.2s ease",
                }}
                className="group-hover:opacity-100"
              />
              {/* Underline */}
              <path
                d={`M ${x} ${y + height} L ${x + width} ${y + height}`}
                stroke={baseColors.border}
                strokeWidth="2"
                fill="none"
                opacity={0.8}
                style={{
                  transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                }}
                className="group-hover:opacity-100"
              />
            </>
          ) : null}

          {/* Node text - only show when NOT editing (overlay handles editing) */}
          {!isEditing && (
            <foreignObject
              x={x}
              y={y}
              width={finalWidth}
              height={finalHeight}
              style={{
                pointerEvents: isUrl(node.text) ? "auto" : "none",
                overflow: "visible",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: style.hasBox ? "center" : "flex-end", // Align to underline for boxless
                  justifyContent: "center",
                  padding: `${NODE_PADDING_Y}px ${NODE_PADDING_X}px`,
                  fontSize: `${style.fontSize}px`,
                  fontWeight: style.fontWeight,
                  fontFamily: "inherit",
                  color: style.text,
                  textAlign: "center",
                  userSelect: "none",
                  lineHeight: "1.3",
                  textShadow: style.textShadow,
                  wordBreak: "normal",
                  overflowWrap: "anywhere",
                  boxSizing: "border-box",
                  position: "relative",
                  overflow: "visible", // Ensure tooltips aren't clipped
                }}
                className={isUrl(node.text) ? "" : "pointer-events-none"}
              >
                <div
                  className="w-full text-center"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    overflow: style.hasBox ? "hidden" : "visible",
                  }}
                >
                  {node.text === "..." ? (
                    ".."
                  ) : isUrl(node.text) ? (
                    <span className="h-auto p-0 underline">{node.text}</span>
                  ) : (
                    node.text
                  )}
                </div>

                {/* Note Indicator Indicator - Always show small preview text */}
                {node.note && (
                  <div className="absolute top-0 right-0 p-1 pointer-events-auto group/note flex items-center gap-1.5">
                    <div className="text-[9px] text-muted-foreground font-medium max-w-[150px] truncate">
                      {node.note}
                    </div>
                    <div className="bg-primary/20 p-0.5 rounded-full backdrop-blur-sm shadow-sm hover:scale-125 transition-transform shrink-0">
                      <MessageSquare className="h-2.5 w-2.5 text-primary" />
                    </div>
                    {/* Hover Tooltip - Local absolute positioning avoids SVG scale drift */}
                    <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/note:opacity-100 pointer-events-none transition-all duration-200 translate-y-2 group-hover/note:translate-y-0 z-[100] min-w-[150px] max-w-[240px] bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-lg p-3 text-xs text-foreground text-left">
                      <MessageSquare className="size-3 text-primary" />
                      <div className="leading-relaxed whitespace-pre-wrap font-medium">
                        {node.note}
                      </div>
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full right-3 -translate-y-px border-8 border-transparent border-t-background/95 drop-shadow-sm" />
                    </div>
                  </div>
                )}
              </div>
            </foreignObject>
          )}

          {/* External link button - show on hover for URL nodes */}
          {!isEditing && isUrl(node.text) && (
            <foreignObject
              x={x + finalWidth - 28}
              y={y - 8}
              width="32"
              height="32"
              style={{ pointerEvents: "auto", overflow: "visible" }}
              className="external-link-button opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button
                variant="link"
                size="icon"
                className="w-8 h-8 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    node.text.trim(),
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                title="Open link in new tab"
              >
                <ExternalLinkIcon size={14} />
              </Button>
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
            className="collapse-button pointer-events-auto"
          >
            <circle
              cx={x + width + 12}
              cy={style.hasBox ? y + height / 2 : y + height - 10}
              r={10}
              fill={baseColors.bg}
              stroke={baseColors.border}
              strokeWidth="1.5"
              className="hover:brightness-90"
            />
            <text
              x={x + width + 12}
              y={style.hasBox ? y + height / 2 : y + height - 10}
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
                  cy={style.hasBox ? y + height / 2 - 8 : y + height - 18}
                  r={8}
                  fill={baseColors.border}
                />
                <text
                  x={x + width + 22}
                  y={style.hasBox ? y + height / 2 - 8 : y + height - 18}
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
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${
        className || "relative h-full w-full"
      } select-none transition-colors duration-300 overflow-hidden ${
        !isFullscreen ? "rounded-xl border border-border/40 shadow-sm" : ""
      }`}
      style={{
        touchAction: "none",
        overscrollBehavior: "contain",
        backgroundColor: isDark
          ? "rgba(10, 10, 10, 0.4)"
          : "rgba(255, 255, 255, 0.6)",
      }}
    >
      {/* 1. Underlying SVG content - sits behind everything */}
      <div className="absolute inset-0 z-0">
        <div
          ref={svgContainerRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          <svg
            width={svgSize.width}
            height={svgSize.height}
            className="select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "top left",
              // Remove transition during zoom/pan to prevent lag behind cursor
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          >
            {rootLayouts.map(renderNode)}
          </svg>
        </div>
      </div>

      {/* Editing node overlay - rendered separately to be on top */}
      {editingNode && layout && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 50 }}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {(() => {
              // Find editing node layout across ALL roots
              const findNodeLayout = (nl: NodeLayout): NodeLayout | null => {
                if (nl.node.id === editingNode.id) return nl;
                for (const child of nl.children) {
                  const found = findNodeLayout(child);
                  if (found) return found;
                }
                return null;
              };
              // Search across all root layouts
              let nodeLayout: NodeLayout | null = null;
              for (const rootLayout of rootLayouts) {
                nodeLayout = findNodeLayout(rootLayout);
                if (nodeLayout) break;
              }
              if (!nodeLayout) return null;

              const { x, y, width, height, level } = nodeLayout;
              const baseColors = getNodeColor(
                level,
                nodeLayout.branchIndex,
                isDark
              );
              const style = getSemanticStyle(
                nodeLayout.node.semanticType,
                level,
                renderMode,
                baseColors,
                isDark
              );
              const editDimensions = measureNode(
                editValue || "",
                style.fontSize
              );
              const finalWidth = Math.max(width, editDimensions.width);
              const finalHeight = Math.max(height, editDimensions.height);

              return (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                  }}
                >
                  {/* 1. Main Textarea (Title) */}
                  <div
                    style={{
                      position: "absolute",
                      left: x,
                      top: y,
                      width: finalWidth,
                      height: finalHeight,
                      pointerEvents: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: style.hasBox ? style.bg : "transparent",
                      border: `2px solid ${baseColors.border}`,
                      borderRadius: `${BORDER_RADIUS}px`,
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <textarea
                      key={editingNode.id}
                      ref={inputRef as any}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        // Delegate to handleKeyDown for structured shortcuts (Tab, Enter, etc)
                        // This allows Enter/Tab to be handled consistently
                        if (
                          e.key === "Tab" ||
                          e.key === "Enter" ||
                          e.key === "Backspace" ||
                          e.key === "Escape" ||
                          e.altKey
                        ) {
                          handleKeyDown(e);
                        }
                      }}
                      spellCheck={false}
                      autoCorrect="off"
                      onBlur={(e) => {
                        setTimeout(() => {
                          if (
                            document.activeElement !== noteInputRef.current &&
                            editingNode
                          ) {
                            handleEditSave();
                          }
                        }, 100);
                      }}
                      onClick={() => setIsNoteVisible(true)}
                      style={{
                        width: "100%",
                        height: "100%", // Fit container exactly
                        maxHeight: "100%",
                        fontSize: `${style.fontSize}px`,
                        padding: `${NODE_PADDING_Y}px ${NODE_PADDING_X}px`,
                        textAlign: "center",
                        lineHeight: "1.3",
                        fontWeight: style.fontWeight,
                        fontFamily: "inherit",
                        background: "transparent",
                        color: style.text,
                        outline: "none",
                        caretColor: style.text,
                        wordBreak: "normal",
                        overflowWrap: "anywhere",
                        cursor: "text",
                        resize: "none",
                        border: "none",
                        display: "block",
                        overflow: "hidden", // Hide redundant scrollbars
                        boxSizing: "border-box", // Ensure padding doesn't cause overflow
                      }}
                    />
                  </div>

                  {/* 2. Side Note Editor (Now below the node, using HTML for no clipping) */}
                  {isNoteVisible && (
                    <div
                      style={{
                        position: "absolute",
                        left: x + finalWidth / 2,
                        top: y + finalHeight + 8, // Closer to node
                        width: 260, // Slightly narrower
                        transform: "translateX(-50%)",
                        pointerEvents: "auto",
                      }}
                    >
                      <div className="flex flex-col gap-1.5 p-2 bg-background/95 backdrop-blur-xl border border-primary/20 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                        <textarea
                          ref={noteInputRef}
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          onBlur={(e) => {
                            setTimeout(() => {
                              if (
                                document.activeElement !== inputRef.current &&
                                editingNode
                              ) {
                                handleEditSave();
                              }
                            }, 100);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") {
                              handleEditCancel();
                            }
                            if (e.key === "Enter" && e.altKey) {
                              handleEditSave();
                            }
                            if (e.key.toLowerCase() === "t" && e.altKey) {
                              e.preventDefault();
                              inputRef.current?.focus();
                            }
                          }}
                          placeholder="Add deeper context here..."
                          spellCheck={false}
                          autoCorrect="off"
                          className="w-full h-[60px] bg-muted/20 hover:bg-muted/30 focus:bg-muted/40 rounded-lg p-2 text-xs outline-none transition-all resize-none overflow-y-auto leading-tight text-foreground placeholder:text-muted-foreground/30 custom-scrollbar"
                        />
                        <div className="mt-1 pt-2 flex items-center justify-between border-t border-primary/5">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col items-center">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 font-medium">
                                <kbd className="pointer-events-none h-3.5 select-none items-center gap-1 rounded border border-border/80 bg-muted/80 px-1 font-mono text-[7px] font-bold flex text-foreground">
                                  alt
                                </kbd>
                                <span className="opacity-70">+</span>
                                <kbd className="pointer-events-none h-3.5 select-none items-center gap-1 rounded border border-border/80 bg-muted/80 px-1 font-mono text-[7px] font-bold flex text-foreground">
                                  n
                                </kbd>
                                <span className="ml-0.5 opacity-60">
                                  to note
                                </span>
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 font-medium">
                                <kbd className="pointer-events-none h-3.5 select-none items-center gap-1 rounded border border-border/80 bg-muted/80 px-1 font-mono text-[7px] font-bold flex text-foreground">
                                  alt
                                </kbd>
                                <span className="opacity-70">+</span>
                                <kbd className="pointer-events-none h-3.5 select-none items-center gap-1 rounded border border-border/80 bg-muted/80 px-1 font-mono text-[7px] font-bold flex text-foreground">
                                  enter
                                </kbd>
                                <span className="ml-0.5 opacity-60">
                                  to save
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-background/50 p-1 rounded-xl border border-border/40 shadow-sm backdrop-blur-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90"
                              onClick={() => deleteNode(editingNode.id)}
                              title="Delete"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="default"
                              size="icon"
                              className="h-7 w-7 rounded-lg shadow-md transition-all active:scale-90 bg-primary hover:bg-primary/90"
                              onClick={handleEditSave}
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2. Toolbars - MUST stay on top */}
      {/* Zoom controls (Bottom Right) */}
      <div className="absolute bottom-4 right-4 flex gap-1 z-[100] pointer-events-auto">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-auto px-2 fs-xs bg-background/90 backdrop-blur-md shadow-sm border-border/50"
          onClick={() =>
            handleSetRenderMode((m) =>
              m === "brainstorm"
                ? "study"
                : m === "study"
                ? "classic"
                : "brainstorm"
            )
          }
          title={`Switch to ${
            renderMode === "brainstorm"
              ? "Study"
              : renderMode === "study"
              ? "Classic"
              : "Brainstorm"
          } Mode`}
        >
          {renderMode === "brainstorm" ? (
            <Brain className="h-3.5 w-3.5 text-primary" />
          ) : renderMode === "study" ? (
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Layout className="h-3.5 w-3.5 text-primary" />
          )}
          <span className="ml-1.5 text-xs font-medium tracking-wider">
            {renderMode === "brainstorm"
              ? "Thinking"
              : renderMode === "study"
              ? "Learning"
              : "Classic"}
          </span>
        </Button>
        <div className="flex border border-border/50 rounded-md overflow-hidden bg-background/90 backdrop-blur-md shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoomIn()}
            className="h-7 w-7 rounded-none border-r border-border/50 hover:bg-accent"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoomOut()}
            className="h-7 w-7 rounded-none border-r border-border/50 hover:bg-accent"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fitToView}
            className="h-7 w-7 rounded-none border-r border-border/50 hover:bg-accent"
            title="Center view"
          >
            <Focus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-7 w-7 rounded-none hover:bg-accent"
            title={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <span className="flex items-center px-1.5 text-[10px] font-mono text-muted-foreground bg-background/90 backdrop-blur-md rounded border border-border/50 shadow-sm min-w-[35px] justify-center">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Help & Tips removed from here - moved to sidebar */}

      {/* Mini Map (Bottom Right) */}
      {showMiniMap && layout && (
        <div
          ref={miniMapRef}
          className="absolute bottom-14 right-4 z-[100] pointer-events-auto cursor-pointer rounded-lg border border-border/50 shadow-lg overflow-hidden p-2"
          style={{
            width: MINI_MAP_WIDTH,
            height: MINI_MAP_HEIGHT,
            backgroundColor: isDark
              ? "rgba(20,20,20,0.9)"
              : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
          }}
          onClick={handleMiniMapClick}
        >
          {/* Mini map content */}
          <svg
            width={MINI_MAP_INNER_WIDTH}
            height={MINI_MAP_INNER_HEIGHT}
            style={{ display: "block" }}
          >
            {/* Render simplified nodes */}
            <g
              transform={`scale(${
                Math.min(
                  MINI_MAP_INNER_WIDTH / svgSize.width,
                  MINI_MAP_INNER_HEIGHT / svgSize.height
                ) * 0.95
              })`}
            >
              {/* Simplified node rectangles */}
              {(() => {
                const nodes: React.ReactNode[] = [];
                const renderSimplified = (nl: NodeLayout) => {
                  const colors = getNodeColor(nl.level, nl.branchIndex, isDark);
                  nodes.push(
                    <rect
                      key={nl.node.id}
                      x={nl.x}
                      y={nl.y}
                      width={nl.width}
                      height={nl.height}
                      rx={4}
                      fill={
                        nl.level === 0
                          ? colors.bg
                          : isDark
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(0,0,0,0.2)"
                      }
                    />
                  );
                  nl.children.forEach(renderSimplified);
                };
                renderSimplified(layout);
                return nodes;
              })()}
            </g>

            {/* Viewport indicator */}
            {containerRef.current && (
              <rect
                x={
                  (-position.x / scale) *
                  Math.min(
                    MINI_MAP_INNER_WIDTH / svgSize.width,
                    MINI_MAP_INNER_HEIGHT / svgSize.height
                  ) *
                  0.95
                }
                y={
                  (-position.y / scale) *
                  Math.min(
                    MINI_MAP_INNER_WIDTH / svgSize.width,
                    MINI_MAP_INNER_HEIGHT / svgSize.height
                  ) *
                  0.95
                }
                width={
                  (containerRef.current.offsetWidth / scale) *
                  Math.min(
                    MINI_MAP_INNER_WIDTH / svgSize.width,
                    MINI_MAP_INNER_HEIGHT / svgSize.height
                  ) *
                  0.95
                }
                height={
                  (containerRef.current.offsetHeight / scale) *
                  Math.min(
                    MINI_MAP_INNER_WIDTH / svgSize.width,
                    MINI_MAP_INNER_HEIGHT / svgSize.height
                  ) *
                  0.95
                }
                fill="transparent"
                stroke={isDark ? "#60a5fa" : "#3b82f6"}
                strokeWidth={2}
                rx={2}
              />
            )}
          </svg>

          {/* Toggle button */}
          <button
            className="absolute top-1 right-1 p-0.5 rounded bg-background/50 hover:bg-background/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowMiniMap(false);
            }}
            title="Hide mini map"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M2 2L8 8M8 2L2 8"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Mini map toggle button when hidden */}
      {!showMiniMap && (
        <button
          className="absolute bottom-14 right-4 z-[100] pointer-events-auto p-2 rounded-lg border border-border/50 bg-background/90 backdrop-blur-md shadow-sm hover:bg-accent transition-colors"
          onClick={() => setShowMiniMap(true)}
          title="Show mini map"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <rect x="7" y="7" width="6" height="6" rx="1" />
          </svg>
        </button>
      )}

      {/* 3. Radial Context Menu */}
      {showRadialMenu && (
        <div
          className="absolute inset-0 z-[1000] pointer-events-auto overflow-hidden"
          onClick={closeRadialMenu}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleContextMenu(e);
          }}
        >
          <div
            className="absolute origin-center"
            style={{
              left: radialMenuPos.x,
              top: radialMenuPos.y,
              transform: "translate(-50%, -50%)",
              // Only animate-in on initial show, not on move
              // We'll use a simple CSS class for entrance
            }}
          >
            {/* SVG Donut Ring */}
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              className="drop-shadow-[0_25px_60px_rgba(0,0,0,0.6)] animate-in zoom-in duration-200"
            >
              {[
                {
                  id: "reset",
                  icon: <RotateCcw strokeWidth={2.5} className="h-6 w-6" />,
                  onClick: () => {
                    closeRadialMenu();
                    setShowResetDialog(true);
                  },
                  startAngle: -35,
                  endAngle: 35,
                  defaultColor: "rgba(75, 85, 99, 0.8)",
                  hoverColor: "rgba(243, 244, 246, 0.95)",
                  iconColor: "#FFFFFF",
                  hoverIconColor: "#111827",
                },
                {
                  id: "add-root",
                  icon: <Plus strokeWidth={2.5} className="h-7 w-7" />,
                  onClick: () => handleAddNewRoot(),
                  startAngle: 37,
                  endAngle: 107,
                  defaultColor: "rgba(59, 130, 246, 0.85)", // Blue for 'Add'
                  hoverColor: "rgba(243, 244, 246, 0.95)",
                  iconColor: "#FFFFFF",
                  hoverIconColor: "#3b82f6",
                },
                {
                  id: "center",
                  icon: <Focus strokeWidth={2.5} className="h-6 w-6" />,
                  onClick: () => fitToView(),
                  startAngle: 109,
                  endAngle: 179,
                  defaultColor: "rgba(75, 85, 99, 0.8)",
                  hoverColor: "rgba(243, 244, 246, 0.95)",
                  iconColor: "#FFFFFF",
                  hoverIconColor: "#111827",
                },
                {
                  id: "zoom-out",
                  icon: <ZoomOut strokeWidth={2.5} className="h-6 w-6" />,
                  onClick: () => zoomOut(radialMenuPos),
                  startAngle: 181,
                  endAngle: 251,
                  defaultColor: "rgba(75, 85, 99, 0.8)",
                  hoverColor: "rgba(243, 244, 246, 0.95)",
                  iconColor: "#FFFFFF",
                  hoverIconColor: "#111827",
                },
                {
                  id: "zoom-in",
                  icon: <ZoomIn strokeWidth={2.5} className="h-7 w-7" />,
                  onClick: () => zoomIn(radialMenuPos),
                  startAngle: 253,
                  endAngle: 323,
                  defaultColor: "rgba(75, 85, 99, 0.8)",
                  hoverColor: "rgba(243, 244, 246, 0.95)",
                  iconColor: "#FFFFFF",
                  hoverIconColor: "#111827",
                },
              ].map((item, i) => {
                const outerR = 80;
                const innerR = 38;
                const cx = 90;
                const cy = 90;

                const polarToCartesian = (
                  centerX: number,
                  centerY: number,
                  radius: number,
                  angleInDegrees: number
                ) => {
                  const angleInRadians =
                    ((angleInDegrees - 90) * Math.PI) / 180.0;
                  return {
                    x: centerX + radius * Math.cos(angleInRadians),
                    y: centerY + radius * Math.sin(angleInRadians),
                  };
                };

                const startOuter = polarToCartesian(
                  cx,
                  cy,
                  outerR,
                  item.startAngle
                );
                const endOuter = polarToCartesian(
                  cx,
                  cy,
                  outerR,
                  item.endAngle
                );
                const startInner = polarToCartesian(
                  cx,
                  cy,
                  innerR,
                  item.startAngle
                );
                const endInner = polarToCartesian(
                  cx,
                  cy,
                  innerR,
                  item.endAngle
                );

                const largeArcFlag = "0";

                const d = [
                  "M",
                  startOuter.x,
                  startOuter.y,
                  "A",
                  outerR,
                  outerR,
                  0,
                  largeArcFlag,
                  1,
                  endOuter.x,
                  endOuter.y,
                  "L",
                  endInner.x,
                  endInner.y,
                  "A",
                  innerR,
                  innerR,
                  0,
                  largeArcFlag,
                  0,
                  startInner.x,
                  startInner.y,
                  "Z",
                ].join(" ");

                const midAngle = (item.startAngle + item.endAngle) / 2;
                const iconPos = polarToCartesian(
                  cx,
                  cy,
                  (outerR + innerR) / 2,
                  midAngle
                );

                return (
                  <g
                    key={item.id}
                    className="group"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                      closeRadialMenu();
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseEnter={(e) => {
                      const path = e.currentTarget.querySelector("path");
                      const icon = e.currentTarget.querySelector(
                        ".icon-container"
                      ) as HTMLDivElement;
                      if (path) path.style.fill = item.hoverColor;
                      if (icon) icon.style.color = item.hoverIconColor;
                    }}
                    onMouseLeave={(e) => {
                      const path = e.currentTarget.querySelector("path");
                      const icon = e.currentTarget.querySelector(
                        ".icon-container"
                      ) as HTMLDivElement;
                      if (path) path.style.fill = item.defaultColor;
                      if (icon) icon.style.color = item.iconColor;
                    }}
                  >
                    <path
                      d={d}
                      fill={item.defaultColor}
                      className="transition-colors duration-200 cursor-pointer"
                    />
                    <foreignObject
                      x={iconPos.x - 14}
                      y={iconPos.y - 14}
                      width="28"
                      height="28"
                      className="pointer-events-none"
                    >
                      <div
                        className="icon-container flex items-center justify-center w-full h-full transition-colors duration-200"
                        style={{ color: item.iconColor }}
                      >
                        {item.icon}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}

              {/* Hollow center indicator dot */}
              <circle
                cx="90"
                cy="90"
                r="4"
                fill="#3b82f6"
                fillOpacity="0.8"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Reset to Default Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset View to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset zoom to 100% and center the view to (0, 0). Your
              mindmap content will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetView();
                setShowResetDialog(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
