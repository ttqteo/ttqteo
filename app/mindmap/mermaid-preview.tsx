"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MindmapNode } from "./types";

interface MermaidPreviewProps {
  code: string;
  tree: MindmapNode;
  onNodeEdit?: (nodeId: string, newText: string) => void;
  className?: string;
}

// Custom theme to match div-based editor colors
const CUSTOM_THEME = {
  theme: "base",
  themeVariables: {
    // Primary colors matching LEVEL_COLORS
    primaryColor: "#3b82f6", // blue-500
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#2563eb", // blue-600
    // Secondary colors
    secondaryColor: "#fbbf24", // amber-400
    secondaryTextColor: "#1f2937",
    secondaryBorderColor: "#f59e0b",
    // Tertiary colors
    tertiaryColor: "#34d399", // emerald-400
    tertiaryTextColor: "#1f2937",
    tertiaryBorderColor: "#10b981",
    // Background
    background: "#ffffff",
    mainBkg: "#ffffff",
    // Node styling
    nodeBorder: "#2563eb",
    nodeTextColor: "#ffffff",
    // Mindmap specific
    mindmapNode1BgColor: "#3b82f6",
    mindmapNode2BgColor: "#fbbf24",
    mindmapNode3BgColor: "#34d399",
    mindmapNode4BgColor: "#fb7185",
    mindmapNode5BgColor: "#a78bfa",
    mindmapNode6BgColor: "#22d3d8",
  },
};

// Initialize mermaid with custom config
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: CUSTOM_THEME.themeVariables,
  mindmap: {
    useMaxWidth: false,
    padding: 20,
  },
  securityLevel: "loose",
});

/**
 * MermaidPreview - Interactive Mermaid SVG renderer with click-to-edit
 *
 * Features:
 * - Custom styling to match div-based editor
 * - Click on nodes to edit text
 * - Pan and zoom support
 */
export function MermaidPreview({
  code,
  tree,
  onNodeEdit,
  className = "",
}: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Editing state
  const [editingNode, setEditingNode] = useState<{
    id: string;
    text: string;
    rect: DOMRect;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a map of text -> node for click detection
  const textToNodeMap = useRef<Map<string, MindmapNode>>(new Map());

  // Build text to node map from tree
  useEffect(() => {
    const map = new Map<string, MindmapNode>();
    const traverse = (node: MindmapNode) => {
      map.set(node.text, node);
      node.children.forEach(traverse);
    };
    traverse(tree);
    textToNodeMap.current = map;
  }, [tree]);

  // Render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) {
        setSvgContent("");
        setError(null);
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram"
        );
        setSvgContent("");
      } finally {
        setIsRendering(false);
      }
    };

    const timeoutId = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timeoutId);
  }, [code]);

  // Add click handlers to SVG nodes after render
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent || !onNodeEdit) return;

    const svgElement = svgContainerRef.current.querySelector("svg");
    if (!svgElement) return;

    // Find all text elements and make them clickable
    const textElements = svgElement.querySelectorAll("text, .nodeLabel");

    textElements.forEach((element) => {
      const textContent = element.textContent?.trim() || "";
      const node = textToNodeMap.current.get(textContent);

      if (node) {
        // Style the parent group for hover effect
        const parentGroup = element.closest("g");
        if (parentGroup) {
          parentGroup.style.cursor = "pointer";
          parentGroup.classList.add("mindmap-node-interactive");

          // Add click handler
          parentGroup.onclick = (e) => {
            e.stopPropagation();
            const rect = element.getBoundingClientRect();
            setEditingNode({ id: node.id, text: node.text, rect });
            setEditValue(node.text);
          };
        }
      }
    });

    // Add CSS for hover effects
    const style = document.createElement("style");
    style.textContent = `
      .mindmap-node-interactive:hover {
        filter: brightness(1.1);
        transform: scale(1.02);
        transition: all 0.15s ease;
      }
      .mindmap-node-interactive:hover rect,
      .mindmap-node-interactive:hover path,
      .mindmap-node-interactive:hover polygon {
        stroke-width: 3px !important;
      }
    `;
    svgElement.appendChild(style);

    return () => {
      style.remove();
    };
  }, [svgContent, onNodeEdit]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingNode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNode]);

  // Handle edit save
  const handleEditSave = useCallback(() => {
    if (editingNode && editValue.trim() && onNodeEdit) {
      onNodeEdit(editingNode.id, editValue.trim());
    }
    setEditingNode(null);
    setEditValue("");
  }, [editingNode, editValue, onNodeEdit]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingNode(null);
    setEditValue("");
  }, []);

  // Handle key press in edit input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleEditSave();
      } else if (e.key === "Escape") {
        handleEditCancel();
      }
    },
    [handleEditSave, handleEditCancel]
  );

  // Pan and zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(0.25, prev + delta), 3));
  }, []);

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

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <p className="text-destructive font-medium mb-2">Render Error</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
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
        Click node to edit • Drag to pan
      </div>

      {/* Edit input overlay */}
      {editingNode && (
        <div
          className="fixed z-50"
          style={{
            left: editingNode.rect.left,
            top: editingNode.rect.top - 4,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleEditSave}
            className="px-3 py-1.5 border-2 border-primary rounded-lg shadow-lg bg-background text-sm font-medium min-w-[150px] outline-none"
            style={{
              minWidth: Math.max(150, editingNode.rect.width + 20),
            }}
          />
        </div>
      )}

      {/* SVG container with pan/zoom */}
      <div
        className={`overflow-hidden min-h-[300px] ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isRendering ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-pulse text-muted-foreground">
              Rendering...
            </div>
          </div>
        ) : svgContent ? (
          <div
            ref={svgContainerRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
            className="flex items-center justify-center p-4 [&_svg]:max-w-none"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No diagram to display
          </div>
        )}
      </div>
    </div>
  );
}
