"use client";

import { useState, useRef, useCallback, KeyboardEvent, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { MindmapNode } from "./types";
import { generateNodeId } from "./mermaid-converter";

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

interface NodeComponentProps {
  node: MindmapNode;
  level: number;
  nextSiblingId: string | null;
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
  level,
  nextSiblingId,
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isEditing = editingId === node.id;
  const isSelected = selectedId === node.id && !isEditing;
  const isRoot = level === 0;

  // Get colors based on level
  const colorIndex = Math.min(level, LEVEL_COLORS.length - 1);
  const colors = isRoot
    ? LEVEL_COLORS[0]
    : node.children.length > 0
    ? LEVEL_COLORS[colorIndex]
    : CHILD_COLORS[colorIndex % CHILD_COLORS.length];

  useEffect(() => {
    if (isEditing) {
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEdit(node.id, editValue);
      setEditingId(null);

      if (nextSiblingId) {
        setTimeout(() => setEditingId(nextSiblingId), 50);
      } else if (level > 0) {
        onEditAndAddSibling(node.id, editValue);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      setEditingId(null);
      onEditAndAddChild(node.id, editValue);
    } else if (e.key === "Escape") {
      if (node.text === "..." && editValue.trim() === "") {
        onDelete(node.id);
      } else if (node.text === "..." && editValue.trim() !== "") {
        onEdit(node.id, editValue);
      } else {
        setEditValue(node.text);
      }
      setEditingId(null);
    }
  };

  const handleClick = () => {
    if (!isEditing) {
      setEditingId(node.id);
    }
  };

  const handleBlur = () => {
    if (editValue.trim() === "" || editValue.trim() === "..") {
      if (node.children.length > 0) {
        alert(
          "Không thể xoá node đang có node con. Hãy xoá các node con trước."
        );
        setEditValue(node.text);
      } else if (level > 0) {
        onDelete(node.id);
      } else {
        setEditValue(node.text);
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
        tabIndex={0}
        className={`
          relative px-4 py-2 rounded-lg border-2 cursor-pointer
          transition-all duration-200 hover:shadow-md
          text-center font-medium outline-none
          max-w-[250px] break-words
          ${colors.bg} ${colors.text} ${colors.border}
          ${
            isEditing ? "ring-2 ring-offset-2 ring-blue-500" : "hover:scale-105"
          }
          ${isSelected ? "ring-2 ring-offset-2 ring-primary" : ""}
        `}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              // Ignore events during IME composition
              if (e.nativeEvent.isComposing) return;

              if (e.key === "Enter" && !e.shiftKey) {
                handleKeyDown(
                  e as unknown as React.KeyboardEvent<HTMLInputElement>
                );
              } else if (e.key === "Tab" || e.key === "Escape") {
                handleKeyDown(
                  e as unknown as React.KeyboardEvent<HTMLInputElement>
                );
              }
            }}
            onBlur={handleBlur}
            rows={Math.max(1, Math.ceil(editValue.length / 22))}
            className={`
              bg-transparent text-center font-medium outline-none w-full resize-none ${colors.text}
            `}
            style={{
              caretColor: "currentColor",
            }}
          />
        ) : (
          <span>{node.text === "..." ? ".." : node.text}</span>
        )}
      </div>

      {/* Collapse toggle + Children */}
      {node.children.length > 0 && (
        <div className="flex items-center">
          {/* Collapse toggle button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className={`
              w-5 h-5 flex items-center justify-center rounded-full
              ${colors.bg} ${colors.text} ${colors.border}
              border hover:opacity-80 transition-all ml-1
            `}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Children (only when not collapsed) */}
          {!isCollapsed && (
            <div className="flex items-center ml-1">
              {/* Connection line from parent */}
              <div className={`w-4 h-0.5 ${colors.line}`} />

              {/* Children container with vertical line */}
              <div
                className={`flex flex-col gap-3 ${
                  node.children.length > 1 ? "border-l-2" : ""
                }`}
                style={{
                  borderColor:
                    node.children.length > 1 ? "currentColor" : "transparent",
                }}
              >
                {node.children.map((child, index) => {
                  // Get child's colors for the connecting line
                  const childColorIndex = Math.min(
                    level + 1,
                    LEVEL_COLORS.length - 1
                  );
                  const childColors =
                    child.children.length > 0
                      ? LEVEL_COLORS[childColorIndex]
                      : CHILD_COLORS[childColorIndex % CHILD_COLORS.length];

                  // Get next sibling ID
                  const nextSibling = node.children[index + 1];
                  const isFirst = index === 0;
                  const isLast = index === node.children.length - 1;

                  return (
                    <div key={child.id} className="flex items-center relative">
                      {/* Horizontal connector */}
                      <div className={`w-4 h-0.5 ${childColors.line}`} />
                      {/* Cover vertical line at top/bottom edges */}
                      {isFirst && node.children.length > 1 && (
                        <div className="absolute left-[-2px] top-0 w-0.5 h-1/2 bg-background" />
                      )}
                      {isLast && node.children.length > 1 && (
                        <div className="absolute left-[-2px] bottom-0 w-0.5 h-1/2 bg-background" />
                      )}
                      <NodeComponent
                        node={child}
                        level={level + 1}
                        nextSiblingId={nextSibling?.id || null}
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

          {/* Show child count when collapsed */}
          {isCollapsed && (
            <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {node.children.length} items
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface MindmapEditorProps {
  tree: MindmapNode;
  onTreeChange: (newTree: MindmapNode) => void;
  className?: string;
}

/**
 * MindmapEditor - Div-based editor for mindmap nodes
 *
 * This component allows editing the mindmap structure using
 * a visual div-based interface. It does NOT use Mermaid for rendering.
 *
 * Features:
 * - Click to edit nodes
 * - Enter to create sibling
 * - Tab to create child
 * - Escape to cancel
 * - Collapse/expand nodes
 */
export function MindmapEditor({
  tree,
  onTreeChange,
  className = "",
}: MindmapEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pendingEditRef = useRef<{ parentId: string; isChild: boolean } | null>(
    null
  );

  // Effect to handle focusing new nodes after tree updates
  useEffect(() => {
    if (pendingEditRef.current) {
      const timeoutId = setTimeout(() => {
        // Find the new node (marked with "...")
        let newNodeId: string | null = null;

        const findNewNode = (node: MindmapNode): void => {
          if (node.text === "...") {
            newNodeId = node.id;
            return;
          }
          for (const child of node.children) {
            if (newNodeId) return;
            findNewNode(child);
          }
        };

        findNewNode(tree);

        if (newNodeId) {
          pendingEditRef.current = null;
          setEditingId(newNodeId);
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [tree]);

  // Edit a node's text
  const handleEdit = useCallback(
    (id: string, newText: string) => {
      const updateNode = (node: MindmapNode): MindmapNode => {
        if (node.id === id) {
          return { ...node, text: newText };
        }
        return { ...node, children: node.children.map(updateNode) };
      };

      onTreeChange(updateNode(tree));
    },
    [tree, onTreeChange]
  );

  // Add a child to a node
  const handleAddChild = useCallback(
    (parentId: string) => {
      const addChild = (node: MindmapNode): MindmapNode => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [
              ...node.children,
              {
                id: generateNodeId(),
                text: "...",
                children: [],
              },
            ],
          };
        }
        return { ...node, children: node.children.map(addChild) };
      };

      onTreeChange(addChild(tree));
      pendingEditRef.current = { parentId: parentId, isChild: true };
    },
    [tree, onTreeChange]
  );

  // Combined: Edit a node AND add a child in one operation
  const handleEditAndAddChild = useCallback(
    (nodeId: string, newText: string) => {
      const editAndAddChild = (node: MindmapNode): MindmapNode => {
        if (node.id === nodeId) {
          return {
            ...node,
            text: newText,
            children: [
              ...node.children,
              {
                id: generateNodeId(),
                text: "...",
                children: [],
              },
            ],
          };
        }
        return { ...node, children: node.children.map(editAndAddChild) };
      };

      onTreeChange(editAndAddChild(tree));
      pendingEditRef.current = { parentId: nodeId, isChild: true };
    },
    [tree, onTreeChange]
  );

  // Add a sibling to a node
  const handleAddSibling = useCallback(
    (nodeId: string) => {
      const addSibling = (node: MindmapNode): MindmapNode => {
        const childIndex = node.children.findIndex((c) => c.id === nodeId);
        if (childIndex !== -1) {
          const newChildren = [...node.children];
          newChildren.splice(childIndex + 1, 0, {
            id: generateNodeId(),
            text: "...",
            children: [],
          });
          return { ...node, children: newChildren };
        }
        return { ...node, children: node.children.map(addSibling) };
      };

      onTreeChange(addSibling(tree));
      pendingEditRef.current = { parentId: nodeId, isChild: false };
    },
    [tree, onTreeChange]
  );

  // Combined: Edit a node AND add a sibling in one operation
  const handleEditAndAddSibling = useCallback(
    (nodeId: string, newText: string) => {
      const editAndAddSibling = (parentNode: MindmapNode): MindmapNode => {
        const childIndex = parentNode.children.findIndex(
          (c) => c.id === nodeId
        );
        if (childIndex !== -1) {
          const newChildren = [...parentNode.children];
          newChildren[childIndex] = {
            ...newChildren[childIndex],
            text: newText,
          };
          newChildren.splice(childIndex + 1, 0, {
            id: generateNodeId(),
            text: "...",
            children: [],
          });
          return { ...parentNode, children: newChildren };
        }
        return {
          ...parentNode,
          children: parentNode.children.map(editAndAddSibling),
        };
      };

      onTreeChange(editAndAddSibling(tree));
      pendingEditRef.current = { parentId: nodeId, isChild: false };
    },
    [tree, onTreeChange]
  );

  // Delete a node
  const handleDelete = useCallback(
    (nodeId: string) => {
      const deleteNode = (node: MindmapNode): MindmapNode | null => {
        if (node.id === nodeId) {
          return null;
        }
        return {
          ...node,
          children: node.children
            .map(deleteNode)
            .filter((child): child is MindmapNode => child !== null),
        };
      };

      const updatedTree = deleteNode(tree);
      if (updatedTree) {
        onTreeChange(updatedTree);
      }
    },
    [tree, onTreeChange]
  );

  return (
    <div className={`min-w-max ${className}`}>
      <p className="text-xs text-muted-foreground mb-4 text-start">
        💡 Click to edit •{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> =
        next/new sibling •{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Tab</kbd> = new
        child • <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd>{" "}
        = cancel
      </p>

      <div className="flex justify-center py-4">
        <NodeComponent
          node={tree}
          level={0}
          nextSiblingId={null}
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
    </div>
  );
}
