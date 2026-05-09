"use client";

import { useFocusMode } from "@/components/contexts/focus-mode-context";
import { SimpleEditor } from "@/components/simple-editor";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeftIcon,
  Loader2Icon,
  LogOutIcon,
  Maximize2,
  Minimize2,
  PenLineIcon,
  SaveIcon,
  SendIcon,
  TrashIcon,
} from "lucide-react";
import "tldraw/tldraw.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-mono">
      loading tldraw...
    </div>
  ),
});

const ALLOWED_TYPES = ["post", "note", "reading", "paper"] as const;
type PostType = (typeof ALLOWED_TYPES)[number];

function resolveType(raw: string | undefined): PostType {
  if (raw && (ALLOWED_TYPES as readonly string[]).includes(raw)) {
    return raw as PostType;
  }
  return "post";
}

interface PostData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  is_published: boolean;
  type?: PostType;
}

const DRAFT_STORAGE_KEY = "editor-draft";

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export default function EditPostClient({
  initialData,
  isNew,
  initialType,
}: {
  initialData?: PostData;
  isNew: boolean;
  initialType?: string;
}) {
  const router = useRouter();
  const { focusMode, setFocusMode, toggleFocusMode } = useFocusMode();
  const { resolvedTheme } = useTheme();

  const [showTldraw, setShowTldraw] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("editor-show-tldraw") === "true";
  });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [type, setType] = useState<PostType>(
    resolveType(initialData?.type ?? initialType)
  );
  const [post, setPost] = useState<PostData>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    is_published: initialData?.is_published || false,
  });

  // Disable focus mode when leaving editor (entering it is opt-in via toggle)
  useEffect(() => {
    return () => setFocusMode(false);
  }, [setFocusMode]);

  // Update document title with post title
  useEffect(() => {
    document.title = `edit • ${post.title}` || "New Post";
  }, [post.title]);

  // Restore draft from sessionStorage on mount (only for new posts)
  useEffect(() => {
    if (isNew) {
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setPost((prev) => ({ ...prev, ...parsed }));
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [isNew]);

  // Save draft to sessionStorage on change (only for new posts)
  const saveDraft = useCallback(() => {
    if (isNew && (post.title || post.description || post.content)) {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          title: post.title,
          description: post.description,
          content: post.content,
        })
      );
      setLastSaved(new Date());
    }
  }, [isNew, post.title, post.description, post.content]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // Clear draft after successful save
  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  // Auto-generate slug from title with date prefix (year/month/day/name)
  useEffect(() => {
    if (isNew && post.title) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const name = removeVietnameseTones(post.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      // Add random suffix to avoid duplicates
      const suffix = Math.random().toString(36).substring(2, 6);
      const slug = `${year}/${month}/${day}/${name}-${suffix}`;
      setPost((prev) => ({ ...prev, slug }));
    }
  }, [post.title, isNew]);

  const handleDelete = async () => {
    setLoadingAction("delete");
    try {
      const res = await fetch(`/api/posts/${initialData?.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Post moved to trash");
        router.push("/admin");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || err.message || `Failed to delete (${res.status})`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSave = async (publish: boolean, action: string) => {
    setLoadingAction(action);
    try {
      const url = isNew ? "/api/posts" : `/api/posts/${initialData?.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          is_published: publish,
          type,
        }),
      });

      if (res.ok) {
        clearDraft();
        toast.success(publish ? "Post published" : "Draft saved");
        router.push("/admin");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || err.message || `Failed to save (${res.status})`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoadingAction(null);
    }
  };

  const isSplit = showTldraw && !focusMode;

  return (
    <div className={
      focusMode ? "fixed inset-0 z-50 bg-background flex flex-col" :
      isSplit   ? "fixed inset-0 z-40 bg-background flex flex-col pt-[36px]" :
                  "min-h-[80vh]"
    }>
      {/* Sticky Top Header */}
      <div className={`${isSplit || focusMode ? "flex-shrink-0" : "sticky top-[36px]"} bg-background/95 backdrop-blur border-b z-[55] focus-mode-hidden`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
            </Button>
            {/* Auto-save Status */}
            {isNew && lastSaved && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Saved</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isNew && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!!loadingAction}
                  >
                    {loadingAction === "delete" ? (
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This post will be moved to the trash. You can restore it
                      later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Move to Trash
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {post.is_published ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(false, "unpublish")}
                  disabled={!!loadingAction}
                >
                  {loadingAction === "unpublish" ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <LogOutIcon className="w-4 h-4 mr-2" />
                  )}
                  Unpublish
                </Button>

                <Button
                  onClick={() => handleSave(true, "save")}
                  disabled={!!loadingAction}
                >
                  {loadingAction === "save" ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <SaveIcon className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(false, "save-draft")}
                  disabled={!!loadingAction}
                >
                  {loadingAction === "save-draft" ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <SaveIcon className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>

                <Button
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                  onClick={() => handleSave(true, "publish")}
                  disabled={!!loadingAction}
                >
                  {loadingAction === "publish" ? (
                    <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <SendIcon className="w-4 h-4 mr-2" />
                  )}
                  Publish
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom-right controls — always visible */}
      <div className="fixed bottom-4 right-4 z-[51] flex flex-col gap-2">
        {!focusMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={showTldraw ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTldraw((v) => {
                  const next = !v;
                  localStorage.setItem("editor-show-tldraw", String(next));
                  return next;
                })}
                aria-label="Toggle tldraw"
              >
                <PenLineIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {showTldraw ? "Hide drawing board" : "Show drawing board"}
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={focusMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!focusMode) {
                  setShowTldraw(false);
                  localStorage.setItem("editor-show-tldraw", "false");
                }
                toggleFocusMode();
              }}
              aria-label="Toggle focus mode"
            >
              {focusMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {focusMode ? "Exit focus mode" : "Focus mode"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main Content */}
      <div className={
        isSplit || focusMode ? "flex flex-1 overflow-hidden" :
                               "py-8"
      }>
        {/* Editor column */}
        <div className={
          isSplit   ? "w-[55%] overflow-auto py-8 px-8 space-y-6" :
          focusMode ? "flex-1 overflow-auto max-w-2xl mx-auto px-8 py-16 space-y-6 w-full" :
                      "max-w-3xl mx-auto px-4 space-y-6"
        }>
          {/* Title */}
          <Input
            type="text"
            value={post.title}
            onChange={(e) => setPost({ ...post, title: e.target.value })}
            placeholder="Title"
            className="text-4xl font-serif font-bold h-auto py-2 border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />

          {/* Description / Subtitle */}
          <Input
            type="text"
            value={post.description}
            onChange={(e) => setPost({ ...post, description: e.target.value })}
            placeholder="Add a subtitle..."
            className="text-lg text-muted-foreground border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />

          {/* Slug Preview */}
          {(() => {
            const now = new Date();
            const datePrefix = `${now.getFullYear()}/${String(
              now.getMonth() + 1
            ).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
            const slugName = post.title
              ? removeVietnameseTones(post.title)
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")
              : "post-slug";
            return (
              <div className="text-sm text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-1 rounded">
                  /blog/{datePrefix}/{slugName}
                </span>
              </div>
            );
          })()}

          {/* Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as PostType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="paper">Paper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* WYSIWYG Editor */}
          <SimpleEditor
            content={post.content}
            onChange={(content) => setPost({ ...post, content })}
            stickyTop={focusMode || isSplit ? "0px" : null}
          />
        </div>

        {/* tldraw panel */}
        {isSplit && (
          <div className="w-[45%] border-l h-full overflow-hidden">
            <Tldraw
              persistenceKey={`editor-${initialData?.id ?? "new"}`}
              colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
