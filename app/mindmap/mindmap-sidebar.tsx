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
  Cloud,
  Copy,
  RefreshCw,
  Link,
} from "lucide-react";
import { MindmapItem } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTips } from "./sidebar-tips";

interface MindmapSidebarProps {
  mindmaps: MindmapItem[];
  currentId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  syncCode?: string;
  onSetSyncCode: (code?: string) => void;
  onGenerateSyncCode: () => string;
  onRefresh: () => void;
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
  syncCode,
  onSetSyncCode,
  onGenerateSyncCode,
  onRefresh,
}: MindmapSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [showConnect, setShowConnect] = useState(false);
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
              mindmaps
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAdd(`new mindmap ${mindmaps.length + 1}`)}
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

          <div className="border-t border-border/50">
            <SidebarTips />
          </div>

          {/* Cloud Sync Section */}
          <div className="mt-auto border-t p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-3 text-sm font-semibold text-muted-foreground tracking-wider">
              <div className="flex items-center gap-1.5">
                <Cloud className="h-3 w-3" />
                cloud sync
              </div>
            </div>

            {syncCode ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      your sync code:
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:text-primary transition-colors -mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefresh();
                      }}
                      title="Sync Now"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 bg-background border px-2 py-1 rounded font-mono text-sm tracking-widest text-primary font-bold">
                      {syncCode}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(syncCode);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                    >
                      {isCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-tight">
                  use this code on other devices to sync your mindmaps.
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (
                      confirm(
                        "Disconnecting will stop cloud sync on this device. Local data persists. Continue?"
                      )
                    ) {
                      onSetSyncCode(undefined);
                    }
                  }}
                >
                  Disconnect Cloud Sync
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {!showConnect ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs gap-2"
                      onClick={onGenerateSyncCode}
                    >
                      <RefreshCw className="h-3 w-3" />
                      enable cloud sync
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-2"
                      onClick={() => setShowConnect(true)}
                    >
                      <Link className="h-3 w-3" />
                      connect device
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter 10-char code"
                      className="w-full bg-background border rounded px-2 py-1.5 text-xs font-mono tracking-widest uppercase focus:ring-1 focus:ring-primary outline-none"
                      value={inputCode}
                      onChange={(e) =>
                        setInputCode(e.target.value.toUpperCase())
                      }
                      maxLength={10}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        disabled={inputCode.length !== 10}
                        onClick={() => {
                          onSetSyncCode(inputCode);
                          setInputCode("");
                          setShowConnect(false);
                        }}
                      >
                        sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-2"
                        onClick={() => setShowConnect(false)}
                      >
                        cancel
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground leading-tight">
                  sync your mindmaps across devices without creating an account.
                </p>
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
