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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquareIcon,
  FileTextIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  TrashIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Confirm = "trash" | "purge" | null;

interface AdminPostActionsProps {
  id: string;
  title: string;
  slug: string;
  isDeleted: boolean;
  /** MDX posts have no row to edit or delete, so they only offer a view link. */
  selectable: boolean;
  /**
   * Turns on the phone's checkbox column and ticks this row. Absent once the
   * column is already showing, or on a row that can never be selected.
   */
  onStartSelect?: () => void;
}

/**
 * Row actions, one control per action on a wide screen and all of them behind a
 * single button on a phone, where three buttons per row cost more width than
 * the title had to spare.
 *
 * The confirmations are controlled and rendered as siblings rather than wrapped
 * around their triggers: a dialog nested inside the dropdown would be unmounted
 * by the menu closing, the moment it was asked to open.
 */
export function AdminPostActions({
  id,
  title,
  slug,
  isDeleted,
  selectable,
  onStartSelect,
}: AdminPostActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const editHref = selectable && !isDeleted ? `/admin/edit/${id}` : null;

  const handleDelete = async (permanent: boolean) => {
    setLoading(permanent ? "permanent" : "trash");
    setConfirm(null);
    try {
      const res = await fetch(
        `/api/posts/${id}${permanent ? "?permanent=true" : ""}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete post");
      toast.success(permanent ? "Post deleted permanently" : "Post moved to trash");
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

  const busy = !!loading;

  if (!selectable) {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/blog/${slug}`} target="_blank" aria-label="View">
            <FileTextIcon className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="hidden sm:flex gap-1 justify-end">
        {editHref && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={editHref} aria-label="Edit">
              <PencilIcon className="w-4 h-4" />
            </Link>
          </Button>
        )}
        {isDeleted ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              disabled={busy}
              title="Restore"
            >
              {loading === "restore" ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcwIcon className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirm("purge")}
              disabled={busy}
              title="Delete Permanently"
            >
              {loading === "permanent" ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <XCircleIcon className="w-4 h-4" />
              )}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirm("trash")}
            disabled={busy}
            title="Move to Trash"
          >
            {loading === "trash" ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      <div className="flex justify-end sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={busy}
              aria-label={`Hành động cho ${title}`}
            >
              {busy ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <MoreHorizontalIcon className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {onStartSelect && (
              <DropdownMenuItem onSelect={onStartSelect}>
                <CheckSquareIcon className="w-4 h-4 mr-2" />
                Chọn
              </DropdownMenuItem>
            )}
            {editHref && (
              <DropdownMenuItem asChild>
                <Link href={editHref}>
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Sửa
                </Link>
              </DropdownMenuItem>
            )}
            {isDeleted ? (
              <>
                <DropdownMenuItem onSelect={handleRestore}>
                  <RotateCcwIcon className="w-4 h-4 mr-2" />
                  Khôi phục
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setConfirm("purge")}
                >
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Xoá vĩnh viễn
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirm("trash")}
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Chuyển vào trash
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "purge" ? "Permanently delete?" : "Move to trash?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "purge" ? (
                <>
                  Are you sure you want to permanently delete &quot;{title}&quot;?
                  This action cannot be undone.
                </>
              ) : (
                <>
                  &quot;{title}&quot; will be moved to the trash. You can restore
                  it later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(confirm === "purge")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirm === "purge" ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
