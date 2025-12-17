"use client";

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
  TrashIcon,
  RotateCcwIcon,
  XCircleIcon,
  Loader2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface AdminPostActionsProps {
  id: string;
  title: string;
  isDeleted: boolean;
}

export function AdminPostActions({
  id,
  title,
  isDeleted,
}: AdminPostActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (permanent: boolean = false) => {
    setLoading(permanent ? "permanent" : "trash");
    try {
      const url = `/api/posts/${id}${permanent ? "?permanent=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) throw new Error("Failed to delete post");

      toast.success(
        permanent ? "Post deleted permanently" : "Post moved to trash"
      );
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    setLoading("restore");
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted_at: null }),
      });

      if (!res.ok) throw new Error("Failed to restore post");

      toast.success("Post restored");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  if (isDeleted) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={!!loading}
          title="Restore"
        >
          {loading === "restore" ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcwIcon className="w-4 h-4" />
          )}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={!!loading}
              title="Delete Permanently"
            >
              {loading === "permanent" ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <XCircleIcon className="w-4 h-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete &quot;{title}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(true)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          disabled={!!loading}
          title="Move to Trash"
        >
          {loading === "trash" ? (
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
            &quot;{title}&quot; will be moved to the trash. You can restore it
            later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleDelete(false)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Move to Trash
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
