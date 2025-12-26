"use client";

import { useState, useRef, useCallback, KeyboardEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Check,
  Copy,
  Code,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Loader2,
  Layers,
  Eye,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useFocusMode } from "@/components/contexts/focus-mode-context";
import { MindmapNode, DEFAULT_MINDMAP } from "./types";
import { treeToMermaid, parseMermaidToTree } from "./mermaid-converter";
import { MindmapSvgPreview } from "./mindmap-svg-preview";
import { MindmapEditor } from "./mindmap-editor";

interface MindmapViewerProps {
  initialTree?: MindmapNode;
}

type ViewMode = "editor" | "preview";

export function MindmapViewer({
  initialTree = DEFAULT_MINDMAP,
}: MindmapViewerProps) {
  const STORAGE_KEY = "mindmap-tree";

  // Initialize tree from localStorage or use initialTree
  const [tree, setTree] = useState<MindmapNode>(initialTree);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate Mermaid code from tree
  const mermaidCode = treeToMermaid(tree);

  // Initial load from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id && parsed.text) {
            setTree(parsed);
          }
        } catch {
          // Invalid JSON, use default
        }
      }
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Save tree to localStorage on every change
  useEffect(() => {
    if (typeof window !== "undefined" && !isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
    }
  }, [tree, isLoading]);

  const { setFocusMode } = useFocusMode();

  // Sync fullscreen with focus mode
  useEffect(() => {
    setFocusMode(isFullscreen);
  }, [isFullscreen, setFocusMode]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [mermaidCode]);

  const handleCodeChange = useCallback((newCode: string) => {
    const parsed = parseMermaidToTree(newCode);
    if (parsed) {
      setTree(parsed);
    }
  }, []);

  const handleCodeKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Ignore events during IME composition
      if (e.nativeEvent.isComposing) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd, value } = textarea;
      const currentLine =
        value.substring(0, selectionStart).split("\n").pop() || "";
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : "";

      if (e.key === "Enter") {
        e.preventDefault();
        const lineContent = currentLine.trim();
        const hasContent = lineContent.length > 0 && lineContent !== "mindmap";

        if (hasContent) {
          const newLine = "\n" + currentIndent;
          const newValue =
            value.substring(0, selectionStart) +
            newLine +
            value.substring(selectionEnd);
          handleCodeChange(newValue);

          setTimeout(() => {
            if (textarea) {
              const newPos = selectionStart + newLine.length;
              textarea.selectionStart = newPos;
              textarea.selectionEnd = newPos;
              textarea.focus();
            }
          }, 0);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();

        if (e.shiftKey) {
          if (currentIndent.length >= 2) {
            const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
            const newValue =
              value.substring(0, lineStart) + value.substring(lineStart + 2);
            handleCodeChange(newValue);

            setTimeout(() => {
              if (textarea) {
                const newPos = Math.max(selectionStart - 2, lineStart);
                textarea.selectionStart = newPos;
                textarea.selectionEnd = newPos;
                textarea.focus();
              }
            }, 0);
          }
        } else {
          const indent = "  ";
          const newValue =
            value.substring(0, selectionStart) +
            indent +
            value.substring(selectionEnd);
          handleCodeChange(newValue);

          setTimeout(() => {
            if (textarea) {
              const newPos = selectionStart + indent.length;
              textarea.selectionStart = newPos;
              textarea.selectionEnd = newPos;
              textarea.focus();
            }
          }, 0);
        }
      }
    },
    [handleCodeChange]
  );

  const resetTree = useCallback(() => {
    setTree({
      id: "root",
      text: "...",
      children: [],
    });
  }, []);

  return (
    <div
      className={`
      ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-background overflow-hidden"
          : "w-full"
      }
    `}
    >
      <div
        className={`relative border-none bg-background flex flex-col ${
          isFullscreen ? "h-screen" : "h-[80vh] min-h-[500px]"
        }`}
      >
        {/* Toolbar */}
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          {/* View mode toggle */}
          <div className="flex border rounded-md overflow-hidden bg-background/80 backdrop-blur-sm">
            <Button
              variant={viewMode === "editor" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("editor")}
              title="Editor only"
              className="h-8 w-8 rounded-none"
            >
              <Layers className="h-4 w-4" />
            </Button>

            <Button
              variant={viewMode === "preview" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("preview")}
              title="Preview only"
              className="h-8 w-8 rounded-none border-l"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy Mermaid Code"}
            className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowCodePopup(!showCodePopup)}
            title="Edit Mermaid Source"
            className={`h-8 w-8 bg-background/80 backdrop-blur-sm ${
              showCodePopup ? "text-primary border-primary" : ""
            }`}
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                title="Reset Mindmap"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Mindmap?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset the mindmap to its default state. All your
                  changes will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetTree}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Code Sidebar */}
          {showCodePopup && (
            <div
              className="border-r bg-background flex flex-col animate-in slide-in-from-left duration-200 relative"
              style={{ width: sidebarWidth, minWidth: 200, maxWidth: 600 }}
            >
              {/* Resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                  const startX = e.clientX;
                  const startWidth = sidebarWidth;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = startWidth + (e.clientX - startX);
                    setSidebarWidth(Math.min(600, Math.max(200, newWidth)));
                  };

                  const handleMouseUp = () => {
                    setIsResizing(false);
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.removeEventListener("mouseup", handleMouseUp);
                  };

                  document.addEventListener("mousemove", handleMouseMove);
                  document.addEventListener("mouseup", handleMouseUp);
                }}
              />
              <div className="flex-1 overflow-auto p-3">
                <div className="border rounded-lg bg-background overflow-hidden">
                  <div className="bg-muted/50 px-3 py-1.5 border-b flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">
                      mermaid
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCodePopup(false)}
                      className="h-5 w-5 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    value={mermaidCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onKeyDown={handleCodeKeyDown}
                    className="font-mono text-xs border-0 rounded-none focus-visible:ring-0 resize-none w-full h-[calc(100vh-100px)]"
                    placeholder="Enter your mermaid mindmap syntax..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main content area */}
          <div
            className={`flex-1 ${
              isFullscreen ? "h-full overflow-hidden" : "h-full overflow-hidden"
            } relative`}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Loading mindmap...
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Editor panel */}
                {viewMode === "editor" && (
                  <div className="overflow-auto p-6">
                    <MindmapEditor
                      tree={tree}
                      onTreeChange={setTree}
                      className="min-h-full"
                    />
                  </div>
                )}

                {/* Preview panel */}
                {viewMode === "preview" && (
                  <div className="flex-1 relative flex flex-col min-h-0">
                    <div className="flex-none p-2 border-b bg-muted/30">
                      <span className="text-xs text-muted-foreground">
                        mindmap
                      </span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                      <MindmapSvgPreview
                        tree={tree}
                        onTreeChange={setTree}
                        isFullscreen={isFullscreen}
                        className="absolute inset-0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
