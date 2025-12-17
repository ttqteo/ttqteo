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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeftIcon,
  FocusIcon,
  Loader2Icon,
  LogOutIcon,
  SaveIcon,
  SendIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PostData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  is_published: boolean;
}

const DRAFT_STORAGE_KEY = "editor-draft";

export default function EditPostClient({
  initialData,
  isNew,
}: {
  initialData?: PostData;
  isNew: boolean;
}) {
  const router = useRouter();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [post, setPost] = useState<PostData>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    is_published: initialData?.is_published || false,
  });

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
    if (isNew) {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          title: post.title,
          description: post.description,
          content: post.content,
        })
      );
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
      const name = post.title
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
        const error = await res.json();
        toast.error(error.message || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
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
        }),
      });

      if (res.ok) {
        clearDraft();
        router.push("/admin");
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {!focusMode && (
            <Button variant="ghost" asChild>
              <Link href="/admin">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={focusMode ? "default" : "outline"}
                size="icon"
                onClick={toggleFocusMode}
              >
                <FocusIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {focusMode ? "Exit Focus Mode" : "Focus Mode"} (⌘⇧F)
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
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
                </TooltipTrigger>
                <TooltipContent>Move to trash</TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSave(false, "unpublish")}
                    disabled={!!loadingAction}
                  >
                    {loadingAction === "unpublish" ? (
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOutIcon className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Unpublish</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={() => handleSave(true, "save")}
                    disabled={!!loadingAction}
                  >
                    {loadingAction === "save" ? (
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                    ) : (
                      <SaveIcon className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSave(false, "save-draft")}
                    disabled={!!loadingAction}
                  >
                    {loadingAction === "save-draft" ? (
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                    ) : (
                      <SaveIcon className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Draft</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={() => handleSave(true, "publish")}
                    disabled={!!loadingAction}
                  >
                    {loadingAction === "publish" ? (
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                    ) : (
                      <SendIcon className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Publish</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <Input
          type="text"
          value={post.title}
          onChange={(e) => setPost({ ...post, title: e.target.value })}
          placeholder="Blog title..."
          className="text-3xl font-bold h-auto py-2 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:ring-offset-0"
        />

        {/* Slug Preview - hide in focus mode */}
        {!focusMode &&
          (() => {
            const now = new Date();
            const datePrefix = `${now.getFullYear()}/${String(
              now.getMonth() + 1
            ).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
            const slugName = post.title
              ? post.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")
              : "post-slug";
            return (
              <div className="text-sm text-muted-foreground">
                <span>preview: </span>
                <span className="font-mono">
                  /blog/{datePrefix}/{slugName}
                </span>
              </div>
            );
          })()}

        {/* Description - hide in focus mode */}
        {!focusMode && (
          <Input
            type="text"
            value={post.description}
            onChange={(e) => setPost({ ...post, description: e.target.value })}
            placeholder="Brief description..."
            className="text-muted-foreground border-none shadow-none focus-visible:ring-0 focus-visible:ring-primary focus-visible:ring-offset-0"
          />
        )}

        {/* WYSIWYG Editor */}
        <SimpleEditor
          content={post.content}
          onChange={(content) => setPost({ ...post, content })}
        />
      </div>
    </div>
  );
}
