"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Plus,
  X,
  Pencil,
  Check,
  MoreVertical,
  Trash2,
  FileText,
  SquarePen,
  Brain,
  GraduationCap,
  Layout,
} from "lucide-react";
import { MindmapItem } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MindmapSidebarProps {
  mindmaps: MindmapItem[];
  currentId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function MindmapSidebar({
  mindmaps,
  currentId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  isOpen,
  onClose,
}: MindmapSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleRename = useCallback(() => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  }, [editingId, editName, onRename]);

  const sortedMindmaps = useMemo(() => {
    return [...mindmaps].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [mindmaps]);

  const groupedMindmaps = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return {
      thisMonth: sortedMindmaps.filter((m) => m.createdAt >= thisMonth),
      older: sortedMindmaps.filter((m) => m.createdAt < thisMonth),
    };
  }, [sortedMindmaps]);

  const renderItem = (mindmap: MindmapItem) => (
    <div
      key={mindmap.id}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all duration-200 mb-1
        ${
          mindmap.id === currentId
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        }
      `}
      onClick={() => onSelect(mindmap.id)}
    >
      {mindmap.renderMode === "study" ? (
        <GraduationCap
          className={`h-4 w-4 shrink-0 ${
            mindmap.id === currentId ? "text-primary" : "text-muted-foreground"
          }`}
        />
      ) : mindmap.renderMode === "classic" ? (
        <Layout
          className={`h-4 w-4 shrink-0 ${
            mindmap.id === currentId ? "text-primary" : "text-muted-foreground"
          }`}
        />
      ) : (
        <Brain
          className={`h-4 w-4 shrink-0 ${
            mindmap.id === currentId ? "text-primary" : "text-muted-foreground"
          }`}
        />
      )}

      {editingId === mindmap.id ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRename();
          }}
          className="flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            ref={editInputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            className="h-7 text-sm px-1 bg-background"
          />
        </form>
      ) : (
        <>
          <span className="flex-1 text-sm truncate pr-6">{mindmap.name}</span>

          <div className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(mindmap.id);
                    setEditName(mindmap.name);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(mindmap.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-40 bg-background border-r flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0
          ${isOpen ? "lg:w-64" : "lg:w-0 lg:border-none"}
        `}
      >
        <div
          className={`
            w-64 flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out
            ${!isOpen ? "lg:-translate-x-full" : "translate-x-0"}
          `}
        >
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between border-b">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              Mindmaps
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAdd(`New Mindmap ${mindmaps.length + 1}`)}
              title="Create new mindmap"
            >
              <SquarePen className="h-5 w-5" />
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {groupedMindmaps.thisMonth.length > 0 && (
              <div className="mb-6">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  This month
                </h3>
                {groupedMindmaps.thisMonth.map(renderItem)}
              </div>
            )}

            {groupedMindmaps.older.length > 0 && (
              <div>
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Older
                </h3>
                {groupedMindmaps.older.map(renderItem)}
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden absolute top-2 -right-12 bg-background border shadow-md"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mindmap?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "
              {mindmaps.find((m) => m.id === deleteId)?.name}" and all its
              content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDelete(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
