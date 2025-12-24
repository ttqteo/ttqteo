"use client";

import { useState, useRef, useCallback, KeyboardEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Code,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useFocusMode } from "@/components/contexts/focus-mode-context";

interface MindmapViewerProps {
  initialCode?: string;
}

interface TreeNode {
  id: string;
  text: string;
  level: number;
  children: TreeNode[];
}

const DEFAULT_MINDMAP = `mindmap
  root((Mindmap))
    Topic 1
      Subtopic 1.1
      Subtopic 1.2
    Topic 2
      Subtopic 2.1
      Subtopic 2.2
    Topic 3
      Subtopic 3.1`;

// Color palette for different levels
const LEVEL_COLORS = [
  {
    bg: "bg-blue-500",
    text: "text-white",
    border: "border-blue-600",
    line: "bg-blue-400",
  }, // Root
  {
    bg: "bg-amber-400",
    text: "text-gray-800",
    border: "border-amber-500",
    line: "bg-amber-400",
  }, // Level 1
  {
    bg: "bg-emerald-400",
    text: "text-gray-800",
    border: "border-emerald-500",
    line: "bg-emerald-400",
  }, // Level 2
  {
    bg: "bg-rose-400",
    text: "text-gray-800",
    border: "border-rose-500",
    line: "bg-rose-400",
  }, // Level 3
  {
    bg: "bg-purple-400",
    text: "text-white",
    border: "border-purple-500",
    line: "bg-purple-400",
  }, // Level 4
  {
    bg: "bg-cyan-400",
    text: "text-gray-800",
    border: "border-cyan-500",
    line: "bg-cyan-400",
  }, // Level 5
];

const CHILD_COLORS = [
  {
    bg: "bg-amber-200",
    text: "text-gray-800",
    border: "border-amber-300",
    line: "bg-amber-300",
  },
  {
    bg: "bg-emerald-200",
    text: "text-gray-800",
    border: "border-emerald-300",
    line: "bg-emerald-300",
  },
  {
    bg: "bg-rose-200",
    text: "text-gray-800",
    border: "border-rose-300",
    line: "bg-rose-300",
  },
  {
    bg: "bg-purple-200",
    text: "text-gray-800",
    border: "border-purple-300",
    line: "bg-purple-300",
  },
  {
    bg: "bg-cyan-200",
    text: "text-gray-800",
    border: "border-cyan-300",
    line: "bg-cyan-300",
  },
];

// Parse mermaid mindmap syntax to tree structure
function parseMindmap(code: string): TreeNode | null {
  const lines = code.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return null;

  let rootNode: TreeNode | null = null;
  const nodeStack: { node: TreeNode; indent: number }[] = [];
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
      text = rootMatch[1];
    }

    const newNode: TreeNode = {
      id: `node-${idCounter++}`,
      text,
      level: Math.floor(indent / 2),
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

// Convert tree back to mermaid syntax
function treeToMindmap(node: TreeNode, level: number = 0): string {
  const indent = "  ".repeat(level);
  let result = "";

  if (level === 0) {
    result = "mindmap\n";
    result += `  root((${node.text}))\n`;
    for (const child of node.children) {
      result += treeToMindmap(child, 2);
    }
  } else {
    result = `${indent}${node.text}\n`;
    for (const child of node.children) {
      result += treeToMindmap(child, level + 1);
    }
  }

  return result;
}

interface NodeComponentProps {
  node: TreeNode;
  parentId: string | null;
  parentLevel: number;
  onEdit: (id: string, newText: string) => void;
  onAddChild: (id: string) => void;
  onEditAndAddChild: (id: string, newText: string) => void;
  onAddSibling: (id: string) => void;
  onEditAndAddSibling: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

function NodeComponent({
  node,
  parentId,
  parentLevel,
  onEdit,
  onAddChild,
  onEditAndAddChild,
  onAddSibling,
  onEditAndAddSibling,
  onDelete,
  editingId,
  setEditingId,
  selectedId,
  setSelectedId,
}: NodeComponentProps) {
  const [editValue, setEditValue] = useState(
    node.text === "..." ? "" : node.text
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isEditing = editingId === node.id;
  const isSelected = selectedId === node.id && !isEditing;
  const isRoot = parentLevel === -1;

  // Get colors based on level only (not children)
  const colorIndex = Math.min(parentLevel + 1, LEVEL_COLORS.length - 1);
  const colors = isRoot ? LEVEL_COLORS[0] : LEVEL_COLORS[colorIndex];

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    }
  }, [isEditing]);

  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.focus();
    }
  }, [isSelected]);

  useEffect(() => {
    setEditValue(node.text === "..." ? "" : node.text);
  }, [node.text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Enter while editing: save and create new sibling
      e.preventDefault();
      setEditingId(null);
      onEditAndAddSibling(node.id, editValue);
    } else if (e.key === "Tab") {
      // Tab: save and create new child
      e.preventDefault();
      setEditingId(null);
      onEditAndAddChild(node.id, editValue);
    } else if (e.key === "Escape") {
      // Escape: cancel and revert
      setEditValue(node.text);
      setEditingId(null);
    }
  };

  const handleClick = () => {
    if (!isEditing) {
      // Click: start editing immediately
      setEditingId(node.id);
    }
  };

  const handleBlur = () => {
    if (editValue.trim() === "" || editValue.trim() === "..") {
      if (node.children.length > 0) {
        // Node has children - show warning and don't delete
        alert(
          "Không thể xoá node đang có node con. Hãy xoá các node con trước."
        );
        setEditValue(node.text); // Revert to original
      } else {
        // Empty node without children - delete it
        onDelete(node.id);
      }
    } else {
      onEdit(node.id, editValue);
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center">
      {/* Node box */}
      <div
        ref={nodeRef}
        onClick={handleClick}
        className={`
          relative px-4 py-2 rounded-lg border-2 cursor-pointer
          transition-all duration-200 hover:shadow-md
          text-center font-medium outline-none
          ${colors.bg} ${colors.text} ${colors.border}
          ${
            isEditing ? "ring-2 ring-offset-2 ring-blue-500" : "hover:scale-105"
          }
        `}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            size={Math.max(editValue.length, 5)}
            className={`
              bg-transparent text-center font-medium outline-none ${colors.text}
            `}
            style={{
              caretColor: "currentColor",
              width: `${Math.max(editValue.length * 0.6 + 1, 4)}em`,
            }}
          />
        ) : (
          <span>{node.text === "..." ? ".." : node.text}</span>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="flex items-center ml-2">
          {/* Connection line from parent */}
          <div className={`w-6 h-0.5 ${colors.line}`} />

          {/* Vertical line + children container */}
          <div className="relative flex flex-col gap-2">
            {/* Vertical connector line spanning all children */}
            {node.children.length > 1 && (
              <div
                className={`absolute left-0 w-0.5 ${colors.line}`}
                style={{
                  top: "18px",
                  bottom: "18px",
                }}
              />
            )}

            {node.children.map((child) => {
              // Get child's colors for the connecting line
              const childColorIndex = Math.min(
                parentLevel + 2,
                LEVEL_COLORS.length - 1
              );
              const childColors =
                child.children.length > 0
                  ? LEVEL_COLORS[childColorIndex]
                  : CHILD_COLORS[childColorIndex % CHILD_COLORS.length];

              return (
                <div key={child.id} className="flex items-center">
                  <div className={`w-4 h-0.5 ${childColors.line}`} />
                  <NodeComponent
                    node={child}
                    parentId={node.id}
                    parentLevel={parentLevel + 1}
                    onEdit={onEdit}
                    onAddChild={onAddChild}
                    onEditAndAddChild={onEditAndAddChild}
                    onAddSibling={onAddSibling}
                    onEditAndAddSibling={onEditAndAddSibling}
                    onDelete={onDelete}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function MindmapViewer({
  initialCode = DEFAULT_MINDMAP,
}: MindmapViewerProps) {
  const STORAGE_KEY = "mindmap-code";

  // Initialize code from localStorage or use initialCode
  const [code, setCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingEditRef = useRef<{ parentId: string; isChild: boolean } | null>(
    null
  );

  // Initial load from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCode(saved);
      }
      // Small delay for smooth transition
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Save code to localStorage on every change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, [code]);

  const { setFocusMode } = useFocusMode();

  // Sync fullscreen with focus mode
  useEffect(() => {
    setFocusMode(isFullscreen);
  }, [isFullscreen, setFocusMode]);

  const tree = parseMindmap(code);

  // Effect to handle focusing new nodes after tree updates
  useEffect(() => {
    if (pendingEditRef.current) {
      // Delay to ensure React has fully rendered
      const timeoutId = setTimeout(() => {
        const currentTree = parseMindmap(code);
        if (currentTree) {
          // Find the new node marker
          let newNodeId: string | null = null;

          const findNewNode = (node: TreeNode): void => {
            if (node.text === "...") {
              newNodeId = node.id;
              return;
            }
            for (const child of node.children) {
              if (newNodeId) return;
              findNewNode(child);
            }
          };

          findNewNode(currentTree);

          if (newNodeId) {
            pendingEditRef.current = null;
            setEditingId(newNodeId);
          }
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [code]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [code]);

  // Edit a node's text
  const handleEdit = useCallback(
    (id: string, newText: string) => {
      if (!tree) return;

      const updateNode = (node: TreeNode): TreeNode => {
        if (node.id === id) {
          return { ...node, text: newText };
        }
        return { ...node, children: node.children.map(updateNode) };
      };

      const updatedTree = updateNode(tree);
      setCode(treeToMindmap(updatedTree));
    },
    [tree]
  );

  // Add a child to a node
  const handleAddChild = useCallback(
    (parentId: string) => {
      if (!tree) return;

      let newNodeId = "";
      const addChild = (node: TreeNode): TreeNode => {
        if (node.id === parentId) {
          newNodeId = `node-${Date.now()}`;
          return {
            ...node,
            children: [
              ...node.children,
              {
                id: newNodeId,
                text: "...",
                level: node.level + 1,
                children: [],
              },
            ],
          };
        }
        return { ...node, children: node.children.map(addChild) };
      };

      const updatedTree = addChild(tree);
      setCode(treeToMindmap(updatedTree));

      // Mark that we need to edit the new node after tree updates
      pendingEditRef.current = { parentId: parentId, isChild: true };
    },
    [tree]
  );

  // Combined: Edit a node AND add a child in one operation (for Tab key)
  const handleEditAndAddChild = useCallback(
    (nodeId: string, newText: string) => {
      if (!tree) return;

      let newNodeId = "";

      // First update the text, then add child - all in one tree update
      const editAndAddChild = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          newNodeId = `node-${Date.now()}`;
          return {
            ...node,
            text: newText,
            children: [
              ...node.children,
              {
                id: newNodeId,
                text: "...",
                level: node.level + 1,
                children: [],
              },
            ],
          };
        }
        return { ...node, children: node.children.map(editAndAddChild) };
      };

      const updatedTree = editAndAddChild(tree);
      setCode(treeToMindmap(updatedTree));

      // Mark that we need to edit the new node after tree updates
      pendingEditRef.current = { parentId: nodeId, isChild: true };
    },
    [tree]
  );

  // Add a sibling to a node
  const handleAddSibling = useCallback(
    (nodeId: string) => {
      if (!tree) return;

      let newNodeId = "";
      const addSibling = (node: TreeNode): TreeNode => {
        const childIndex = node.children.findIndex((c) => c.id === nodeId);
        if (childIndex !== -1) {
          newNodeId = `node-${Date.now()}`;
          const newChildren = [...node.children];
          newChildren.splice(childIndex + 1, 0, {
            id: newNodeId,
            text: "...",
            level: node.children[childIndex].level,
            children: [],
          });
          return { ...node, children: newChildren };
        }
        return { ...node, children: node.children.map(addSibling) };
      };

      const updatedTree = addSibling(tree);
      setCode(treeToMindmap(updatedTree));

      // Mark that we need to edit the new node after tree updates
      pendingEditRef.current = { parentId: nodeId, isChild: false };
    },
    [tree]
  );

  // Combined: Edit a node AND add a sibling in one operation (for Enter key while editing)
  const handleEditAndAddSibling = useCallback(
    (nodeId: string, newText: string) => {
      if (!tree) return;

      // First update the text, then add sibling - all in one tree update
      const editAndAddSibling = (parentNode: TreeNode): TreeNode => {
        const childIndex = parentNode.children.findIndex(
          (c) => c.id === nodeId
        );
        if (childIndex !== -1) {
          const newChildren = [...parentNode.children];
          // Update the current node's text
          newChildren[childIndex] = {
            ...newChildren[childIndex],
            text: newText,
          };
          // Add new sibling
          newChildren.splice(childIndex + 1, 0, {
            id: `node-${Date.now()}`,
            text: "...",
            level: newChildren[childIndex].level,
            children: [],
          });
          return { ...parentNode, children: newChildren };
        }
        return {
          ...parentNode,
          children: parentNode.children.map(editAndAddSibling),
        };
      };

      const updatedTree = editAndAddSibling(tree);
      setCode(treeToMindmap(updatedTree));

      // Mark that we need to edit the new node after tree updates
      pendingEditRef.current = { parentId: nodeId, isChild: false };
    },
    [tree]
  );

  // Delete a node
  const handleDelete = useCallback(
    (nodeId: string) => {
      if (!tree) return;

      const deleteNode = (node: TreeNode): TreeNode | null => {
        if (node.id === nodeId) {
          return null; // Delete this node
        }
        return {
          ...node,
          children: node.children
            .map(deleteNode)
            .filter((child): child is TreeNode => child !== null),
        };
      };

      const updatedTree = deleteNode(tree);
      if (updatedTree) {
        setCode(treeToMindmap(updatedTree));
      }
    },
    [tree]
  );

  const handleCodeKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
          setCode(newValue);

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
            setCode(newValue);

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
          setCode(newValue);

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
    []
  );

  const resetCode = useCallback(() => {
    if (!window.confirm("Are you sure you want to reset the mindmap?")) return;
    setCode(DEFAULT_MINDMAP);
    setEditingId(null);
  }, []);

  const addRootChild = useCallback(() => {
    if (tree) {
      handleAddChild(tree.id);
    }
  }, [tree, handleAddChild]);

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
        className={`relative border-none bg-background ${
          isFullscreen ? "h-screen" : ""
        }`}
      >
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy Code"}
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
            title="Edit Source Code"
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
          <Button
            variant="outline"
            size="icon"
            onClick={resetCode}
            title="Reset Mindmap"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {showCodePopup && (
          <div className="absolute top-14 right-4 w-[400px] max-h-[80vh] bg-background border rounded-lg shadow-xl z-30 flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-sm font-semibold">Code</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCodePopup(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-auto p-4 flex flex-col gap-4">
              <div className="border rounded-lg bg-background overflow-hidden">
                <div className="bg-muted/50 px-3 py-1.5 border-b flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    mermaid
                  </span>
                  <div className="flex gap-2"></div>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleCodeKeyDown}
                  className="font-mono text-xs border-0 rounded-none focus-visible:ring-0 resize-none w-full min-h-[300px]"
                  placeholder="Enter your mermaid mindmap syntax..."
                />
              </div>
            </div>
          </div>
        )}

        <div
          className={`${
            isFullscreen ? "h-full" : "min-h-[400px]"
          } overflow-auto relative`}
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
            <div className="min-w-max p-6">
              <p className="text-xs text-muted-foreground mb-4 text-center">
                💡 Click to edit •{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                  Enter
                </kbd>{" "}
                = new sibling •{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Tab</kbd>{" "}
                = new child •{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd>{" "}
                = cancel
              </p>

              {tree ? (
                <div className="flex justify-center py-4">
                  <NodeComponent
                    node={tree}
                    parentId={null}
                    parentLevel={-1}
                    onEdit={handleEdit}
                    onAddChild={handleAddChild}
                    onEditAndAddChild={handleEditAndAddChild}
                    onAddSibling={handleAddSibling}
                    onEditAndAddSibling={handleEditAndAddSibling}
                    onDelete={handleDelete}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No mindmap data. Reset or enter code to add content.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
