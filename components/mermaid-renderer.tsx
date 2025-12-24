"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";

interface NodeClickInfo {
  nodeText: string;
  x: number;
  y: number;
}

interface MermaidRendererProps {
  chart: string;
  className?: string;
  onNodeClick?: (info: NodeClickInfo) => void;
}

export function MermaidRenderer({
  chart,
  className = "",
  onNodeClick,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const renderIdRef = useRef(0);

  // Handle click on SVG nodes
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!onNodeClick || !containerRef.current) return;

      const target = e.target as Element;

      // Find the closest node group (g element with class containing 'node')
      let nodeGroup = target.closest("g.mindmap-node, g[class*='node']");

      if (!nodeGroup) {
        // Try to find parent section/group
        nodeGroup = target.closest("g");
      }

      if (nodeGroup) {
        // Try to find text content within the node
        const textElement = nodeGroup.querySelector(
          "text, foreignObject span, foreignObject div"
        );
        if (textElement?.textContent) {
          const nodeText = textElement.textContent.trim();
          if (nodeText && nodeText !== "mindmap") {
            // Get the position relative to the container
            const containerRect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - containerRect.left;
            const y = e.clientY - containerRect.top;

            onNodeClick({ nodeText, x, y });
          }
        }
      }
    },
    [onNodeClick]
  );

  useEffect(() => {
    const currentRenderId = ++renderIdRef.current;
    const timeoutId = setTimeout(async () => {
      if (!containerRef.current || currentRenderId !== renderIdRef.current)
        return;

      const currentTheme = resolvedTheme || theme;

      mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme === "dark" ? "dark" : "default",
        mindmap: {
          padding: 20,
          useMaxWidth: true,
        },
        securityLevel: "loose",
      });

      try {
        setError(null);
        // Generate unique ID for each render to avoid mermaid caching issues
        const uniqueId = `mermaid-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;
        const { svg } = await mermaid.render(uniqueId, chart);

        if (currentRenderId === renderIdRef.current && containerRef.current) {
          containerRef.current.innerHTML = svg;

          // Add cursor pointer to all nodes if onNodeClick is provided
          if (onNodeClick) {
            const nodes = containerRef.current.querySelectorAll(
              "g.mindmap-node, g[class*='node']"
            );
            nodes.forEach((node) => {
              (node as HTMLElement).style.cursor = "pointer";
            });

            // Add click listener
            containerRef.current.addEventListener("click", handleClick);
          }
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        if (currentRenderId === renderIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Invalid mindmap syntax"
          );
        }
      }
    }, 300); // Debounce 300ms to avoid rapid re-renders while typing

    return () => {
      clearTimeout(timeoutId);
      if (containerRef.current) {
        containerRef.current.removeEventListener("click", handleClick);
      }
    };
  }, [chart, theme, resolvedTheme, onNodeClick, handleClick]);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[300px] w-full ${className}`}
      >
        <div className="text-destructive text-center p-4">
          <p className="font-medium mb-2">⚠️ Syntax Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center min-h-[300px] w-full overflow-auto relative ${className}`}
    />
  );
}
