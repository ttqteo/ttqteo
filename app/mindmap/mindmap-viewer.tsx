"use client";

import {
  useState,
  useRef,
  useCallback,
  KeyboardEvent,
  useEffect,
  useMemo,
} from "react";
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
import Image from "next/image";
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
  PanelLeft,
  Cloud,
  CloudOff,
  CloudUpload,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useFocusMode } from "@/components/contexts/focus-mode-context";
import { MindmapNode, MindmapStorage } from "./types";
import { treeToMermaid, parseMermaidToTree } from "./mermaid-converter";
import { MindmapSvgPreview } from "./mindmap-svg-preview";
import { MindmapEditor } from "./mindmap-editor";
import { MindmapSidebar } from "./mindmap-sidebar";
import {
  loadMindmapStorage,
  saveMindmapStorage,
  getCurrentMindmap,
  updateMindmapTree,
  addMindmap,
  deleteMindmap,
  renameMindmap,
  switchMindmap,
  updateMindmapMode,
  mergeMindmaps,
  updateMindmapSyncCode,
  generateSyncCode,
} from "./mindmap-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getMindmaps, upsertMindmap, deleteMindmapSync } from "./actions";
import { User } from "@supabase/supabase-js";

type ViewMode = "editor" | "preview";

export function MindmapViewer() {
  // Storage state for multiple mindmaps
  const [storage, setStorage] = useState<MindmapStorage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Persist states
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFullscreen = localStorage.getItem("mindmap-fullscreen");
      if (savedFullscreen !== null) {
        setIsFullscreen(savedFullscreen === "true");
      } else {
        setIsFullscreen(false);
      }

      const savedSidebar = localStorage.getItem("mindmap-sidebar-open");
      if (savedSidebar !== null) {
        setIsSidebarOpen(savedSidebar === "true");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mindmap-fullscreen", String(isFullscreen));
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mindmap-sidebar-open", String(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const [showCodePopup, setShowCodePopup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Code editor local state
  const [localCode, setLocalCode] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Get current mindmap tree
  const currentMindmap = storage ? getCurrentMindmap(storage) : null;
  const tree = currentMindmap?.tree || {
    id: "root",
    text: "...",
    children: [],
  };

  // Generate Mermaid code from tree
  const mermaidCode = useMemo(() => treeToMermaid(tree), [tree]);

  // Sync local code with tree when tree changes externally (and not typing)
  useEffect(() => {
    if (!isTyping) {
      setLocalCode(mermaidCode);
    }
  }, [mermaidCode, isTyping]);

  // Initial load from localStorage and Supabase
  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined") return;

      // 1. Load from localStorage first for immediate UI
      const localLoaded = loadMindmapStorage();
      setStorage(localLoaded);
      setIsLoading(false);

      // 2. Check Auth
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();
      setUser(supabaseUser);

      if (supabaseUser) {
        // 3a. Fetch from Cloud using Auth
        setSyncStatus("syncing");
        const cloudMindmaps = await getMindmaps();
        if (cloudMindmaps.length > 0) {
          setStorage((prev) => {
            if (!prev) return prev;
            return mergeMindmaps(prev, cloudMindmaps);
          });
        }
        setSyncStatus("synced");
      } else if (localLoaded.syncCode) {
        // 3b. Fetch from Cloud using Sync Code
        setSyncStatus("syncing");
        const cloudMindmaps = await getMindmaps(localLoaded.syncCode);
        if (cloudMindmaps.length > 0) {
          setStorage((prev) => {
            if (!prev) return prev;
            return mergeMindmaps(prev, cloudMindmaps);
          });
        }
        setSyncStatus("synced");
      }
    };

    init();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Save storage to localStorage and Cloud (Supabase)
  useEffect(() => {
    if (typeof window === "undefined" || isLoading || !storage) return;

    // Always save to localStorage
    saveMindmapStorage(storage);

    // Sync to Supabase if logged in or has syncCode
    if (user || storage.syncCode) {
      const timeoutId = setTimeout(async () => {
        setSyncStatus("syncing");
        try {
          const current = getCurrentMindmap(storage);
          if (current) {
            await upsertMindmap(current, user ? undefined : storage.syncCode);
          }
          setSyncStatus("synced");
        } catch (error) {
          console.error("Sync error:", error);
          setSyncStatus("error");
        }
      }, 2000); // 2s debounce

      return () => clearTimeout(timeoutId);
    }
  }, [storage, isLoading, user]);

  const { setFocusMode } = useFocusMode();

  // Sync fullscreen with focus mode
  useEffect(() => {
    setFocusMode(isFullscreen);
  }, [isFullscreen, setFocusMode]);

  // Sync document title with active mindmap name
  useEffect(() => {
    if (typeof window !== "undefined" && currentMindmap?.name) {
      const baseTitle = "mindmap";
      document.title = `${baseTitle} • ${currentMindmap.name.toLowerCase()}`;
    }
  }, [currentMindmap?.name]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [mermaidCode]);

  // Handle tree change for current mindmap
  const handleTreeChange = useCallback((newTree: MindmapNode) => {
    setStorage((prev) => {
      if (!prev) return prev;
      return updateMindmapTree(prev, prev.currentId, newTree);
    });
  }, []);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setLocalCode(newCode);
      setIsTyping(true);

      const parsed = parseMermaidToTree(newCode);
      if (parsed) {
        handleTreeChange(parsed);
      }
    },
    [handleTreeChange]
  );

  // Reset typing flag when popup closes or on blur
  useEffect(() => {
    if (!showCodePopup) {
      setIsTyping(false);
    }
  }, [showCodePopup]);

  const handleCodeKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    handleTreeChange({
      id: "root",
      text: "...",
      children: [],
    });
  }, [handleTreeChange]);

  // Storage handlers
  const handleSelectMindmap = useCallback((id: string) => {
    setStorage((prev) => (prev ? switchMindmap(prev, id) : prev));
  }, []);

  const handleAddMindmap = useCallback((name: string) => {
    setStorage((prev) => (prev ? addMindmap(prev, name) : prev));
  }, []);

  const handleRenameMindmap = useCallback((id: string, name: string) => {
    setStorage((prev) => (prev ? renameMindmap(prev, id, name) : prev));
  }, []);

  const handleDeleteMindmap = useCallback(
    async (id: string) => {
      setStorage((prev) => (prev ? deleteMindmap(prev, id) : prev));
      if (user || (storage && storage.syncCode)) {
        await deleteMindmapSync(id, user ? undefined : storage?.syncCode);
      }
    },
    [user, storage]
  );

  const handleSetSyncCode = useCallback((code?: string) => {
    setStorage((prev) => (prev ? updateMindmapSyncCode(prev, code) : prev));
  }, []);

  const handleGenerateSyncCode = useCallback(() => {
    const code = generateSyncCode();
    handleSetSyncCode(code);
    return code;
  }, [handleSetSyncCode]);

  const handleModeChange = useCallback(
    (mode: "brainstorm" | "study" | "classic") => {
      setStorage((prev) =>
        prev ? updateMindmapMode(prev, prev.currentId, mode) : prev
      );
    },
    []
  );

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
        className={`relative border rounded-xl overflow-hidden bg-background flex ${
          isFullscreen ? "h-screen" : "h-[80vh] min-h-[500px]"
        }`}
      >
        {/* Sidebar for multiple mindmaps */}
        {!isLoading && storage && (
          <MindmapSidebar
            mindmaps={storage.mindmaps}
            currentId={storage.currentId}
            onSelect={handleSelectMindmap}
            onAdd={handleAddMindmap}
            onRename={handleRenameMindmap}
            onDelete={handleDeleteMindmap}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            syncCode={storage.syncCode}
            onSetSyncCode={handleSetSyncCode}
            onGenerateSyncCode={handleGenerateSyncCode}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Toolbar Left */}
          <div className="absolute top-4 left-4 z-20 flex gap-4 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle Sidebar"
              className={`h-8 w-8 bg-background/80 backdrop-blur-sm transition-colors ${
                isSidebarOpen ? "text-primary" : ""
              }`}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            {/* Active Mindmap Name */}
            {currentMindmap && (
              <div className="flex items-center h-8 backdrop-blur-sm rounded-md select-none max-w-[200px] sm:max-w-[300px]">
                <span className="text-sm font-medium truncate text-foreground/90">
                  / {currentMindmap.name} /
                </span>
              </div>
            )}

            {/* Brand Logo - Inline with toggle */}
            {isFullscreen && (
              <div className="select-none opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/logo.png"
                    width={24}
                    height={24}
                    alt="ttqteo"
                    className="rounded-full shadow-sm"
                  />
                  {(user || storage?.syncCode) && (
                    <div className="flex items-center gap-1.5 ml-1 px-2 py-0.5 bg-background/50 backdrop-blur-sm rounded-full border border-border/50">
                      {syncStatus === "syncing" ? (
                        <CloudUpload className="h-3 w-3 animate-pulse text-primary" />
                      ) : syncStatus === "synced" ? (
                        <Cloud className="h-3 w-3 text-green-500" />
                      ) : syncStatus === "error" ? (
                        <CloudOff className="h-3 w-3 text-destructive" />
                      ) : (
                        <Cloud className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-[10px] font-medium text-sm text-muted-foreground tracking-tight">
                        {syncStatus === "syncing"
                          ? "syncing"
                          : syncStatus === "synced"
                          ? "saved"
                          : syncStatus === "error"
                          ? "offline"
                          : "cloud"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="absolute top-4 right-4 flex gap-2 z-20">
            {/* View mode toggle */}
            {/* <div className="flex border rounded-md overflow-hidden bg-background/80 backdrop-blur-sm">
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
            </div> */}

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
                  <AlertDialogAction onClick={resetTree}>
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Code Sidebar (Popup) */}
            {showCodePopup && (
              <div
                className="absolute top-16 right-4 z-40 border rounded-lg shadow-xl bg-background flex flex-col animate-in fade-in zoom-in-95 duration-200"
                style={{
                  width: sidebarWidth,
                  height: "calc(100% - 80px)",
                  minWidth: 300,
                  maxWidth: 800,
                }}
              >
                {/* Resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-[60] opacity-0 hover:opacity-100"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                    const startX = e.clientX;
                    const startWidth = sidebarWidth;

                    const handleMouseMove = (e: MouseEvent) => {
                      const newWidth = startWidth - (e.clientX - startX);
                      setSidebarWidth(Math.min(800, Math.max(300, newWidth)));
                    };

                    const handleMouseUp = () => {
                      setIsResizing(false);
                      document.removeEventListener(
                        "mousemove",
                        handleMouseMove
                      );
                      document.removeEventListener("mouseup", handleMouseUp);
                    };

                    document.addEventListener("mousemove", handleMouseMove);
                    document.addEventListener("mouseup", handleMouseUp);
                  }}
                />
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <Code className="h-3 w-3" /> Mermaid Source
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCodePopup(false)}
                      className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <Textarea
                      ref={textareaRef}
                      value={localCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onBlur={() => setIsTyping(false)}
                      onKeyDown={handleCodeKeyDown}
                      className="absolute inset-0 w-full h-full font-mono text-xs border-0 rounded-none focus-visible:ring-0 resize-none p-3 leading-relaxed break-all"
                      style={{
                        overflowWrap: "break-word",
                        wordBreak: "break-all",
                      }}
                      placeholder="Enter your mermaid mindmap syntax..."
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 relative">
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
                    <div className="overflow-auto p-6 sm:p-10">
                      <MindmapEditor
                        tree={tree}
                        onTreeChange={handleTreeChange}
                        className="min-h-full"
                      />
                    </div>
                  )}

                  {/* Preview panel */}
                  {viewMode === "preview" && (
                    <div className="flex-1 relative flex flex-col min-h-0">
                      <div className="flex-1 relative overflow-hidden">
                        <MindmapSvgPreview
                          tree={tree}
                          onTreeChange={handleTreeChange}
                          isFullscreen={isFullscreen}
                          className="absolute inset-0"
                          renderMode={
                            currentMindmap?.renderMode || "brainstorm"
                          }
                          onModeChange={handleModeChange}
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
    </div>
  );
}
