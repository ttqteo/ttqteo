"use client";

import { FadedScroll } from "@/components/faded-scroll";
import { GUIDE_SERIES, hasTag } from "@/lib/guides";
import {
  clearEditorDraft,
  draftDiffersFrom,
  readEditorDraft,
  saveEditorDraft,
  type EditorDraft,
  type EditorDraftBody,
} from "@/lib/editor-draft";
import {
  DEFAULT_EDITOR_PREFS,
  readEditorPrefs,
  writeEditorPrefs,
  type EditorAlign,
  type EditorPrefs,
  type EditorWidth,
} from "@/lib/editor-prefs";
import { navigationTarget } from "@/lib/nav-guard";
import { clearWriterResume, setWriterResume } from "@/lib/resume-storage";
import { cn } from "@/lib/utils";
import { EditorToc } from "./editor-toc";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  Loader2Icon,
  LogOutIcon,
  PenLineIcon,
  RotateCcwIcon,
  SaveIcon,
  SendIcon,
  Settings2Icon,
  TrashIcon,
} from "lucide-react";
import "tldraw/tldraw.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-mono">
      loading tldraw...
    </div>
  ),
});

// TipTap keo theo ca cay ProseMirror, la phan nang nhat cua route nay. Import
// tinh bat trang phai cho ca graph do compile xong moi ve duoc gi (do duoc 7.5s
// moi lan module editor doi trong dev). Tach chunk giong Tldraw o tren: khung
// trang hien ngay, editor tram vao sau.
const SimpleEditor = dynamic(
  () => import("@/components/simple-editor").then((m) => m.SimpleEditor),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[500px] flex items-center justify-center text-muted-foreground text-sm font-mono">
        loading editor...
      </div>
    ),
  },
);

const ALLOWED_TYPES = ["post", "reading", "paper", "guide"] as const;
type PostType = (typeof ALLOWED_TYPES)[number];

function resolveType(raw: string | undefined): PostType {
  if (raw && (ALLOWED_TYPES as readonly string[]).includes(raw)) {
    return raw as PostType;
  }
  return "post";
}

const TITLE_MAX = 160;
const DESCRIPTION_MAX = 320;

interface PostData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  is_published: boolean;
  type?: PostType;
  tags?: string;
  guide_section?: string | null;
  guide_order?: number | null;
}

/** How long the editor sits still before a draft is written. */
const AUTOSAVE_MS = 5000;

const WIDTH_CLASS: Record<EditorWidth, string> = {
  narrow: "max-w-[720px]",
  wide: "max-w-[1080px]",
};

const ALIGN_CLASS: Record<EditorAlign, string> = {
  center: "mx-auto",
  left: "mr-auto",
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

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
  const { resolvedTheme } = useTheme();

  const [showTldraw, setShowTldraw] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("editor-show-tldraw") === "true";
  });
  // `showTldraw` is the intent; these two are what the DOM needs to animate.
  // The panel has to outlive the intent by one transition so closing slides out
  // instead of vanishing, and it has to mount one frame *before* opening or the
  // browser has no start value to transition from.
  const [panelMounted, setPanelMounted] = useState(showTldraw);
  const [panelOpen, setPanelOpen] = useState(showTldraw);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [type, setType] = useState<PostType>(
    resolveType(initialData?.type ?? initialType),
  );
  const [guideSection, setGuideSection] = useState<string>(
    initialData?.guide_section ?? "",
  );
  const [guideOrder, setGuideOrder] = useState<string>(
    initialData?.guide_order != null ? String(initialData.guide_order) : "",
  );
  // Series suy ra từ tag sẵn có; chọn series mới sẽ tự thêm tag khi save.
  const [seriesTag, setSeriesTag] = useState<string>(
    GUIDE_SERIES.find((s) => hasTag({ tags: initialData?.tags }, s.tag))?.tag ??
      "",
  );
  const [post, setPost] = useState<PostData>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    is_published: initialData?.is_published || false,
    tags: initialData?.tags || "",
  });

  const postId = initialData?.id ?? null;
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // What the server is known to hold. Autosave compares against this so simply
  // opening a post — or a slug the editor regenerated on its own — never counts
  // as an edit worth writing.
  const baselineRef = useRef<EditorDraftBody>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    tags: initialData?.tags || "",
    slug: initialData?.slug || "",
  });

  // A manual save in flight must not be raced by the autosave timer.
  const loadingActionRef = useRef<string | null>(null);

  // Whether the *server* is behind. Distinct from `saveState`: a published post
  // autosaves to localStorage only, so it can read "đã lưu" and still be unsaved
  // as far as anything outside this browser is concerned. This is what the exit
  // guards below key off.
  const [dirtyVsServer, setDirtyVsServer] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Layout prefs live in localStorage, which the server cannot see. Reading
  // them during render would desync hydration, so they land after mount and the
  // first paint uses the defaults.
  const [prefs, setPrefs] = useState<EditorPrefs>(DEFAULT_EDITOR_PREFS);
  useEffect(() => {
    setPrefs(readEditorPrefs());
  }, []);
  const updatePrefs = useCallback((patch: Partial<EditorPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writeEditorPrefs(next);
      return next;
    });
  }, []);

  const PANEL_MS = 300;

  useEffect(() => {
    if (showTldraw) {
      setPanelMounted(true);
      // Opening on the next frame gives the transition a `w-0` to start from.
      const frame = requestAnimationFrame(() => setPanelOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    setPanelOpen(false);
    const timer = setTimeout(() => setPanelMounted(false), PANEL_MS);
    return () => clearTimeout(timer);
  }, [showTldraw]);

  // Show "scroll to top" once user has scrolled past threshold.
  // Split mode scrolls inside a flex container; normal mode scrolls the window.
  const editorColumnRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToTop = useCallback(() => {
    const col = editorColumnRef.current;
    if (col && col.scrollHeight > col.clientHeight) {
      col.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const col = editorColumnRef.current;
    const usesColumn = !!col && col.scrollHeight > col.clientHeight;
    const target: HTMLElement | Window = usesColumn ? col : window;
    const getY = () =>
      usesColumn ? (col as HTMLElement).scrollTop : window.scrollY;
    const onScroll = () => setShowScrollTop(getY() > 400);
    onScroll();
    target.addEventListener("scroll", onScroll, {
      passive: true,
    } as AddEventListenerOptions);
    return () => target.removeEventListener("scroll", onScroll);
  }, [showTldraw]);

  // Update document title with post title
  useEffect(() => {
    document.title = `edit • ${post.title}` || "New Post";
  }, [post.title]);

  // Hand the title over to the header once it scrolls away, so there is always
  // something naming the post on screen.
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const [titleInHeader, setTitleInHeader] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const col = editorColumnRef.current;
    // Split mode scrolls inside the editor column; normal mode scrolls the
    // window. The observer has to watch whichever one is actually moving.
    const usesColumn = !!col && col.scrollHeight > col.clientHeight;
    const observer = new IntersectionObserver(
      ([entry]) => setTitleInHeader(!entry.isIntersecting),
      {
        root: usesColumn ? col : null,
        // The header floats over the top of the scrollport, so the handover
        // happens when the title slides under it, not when it leaves the
        // viewport entirely.
        rootMargin: "-96px 0px 0px 0px",
        threshold: 0,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTldraw, panelMounted]);

  useEffect(() => {
    loadingActionRef.current = loadingAction;
  }, [loadingAction]);

  const buildPayload = useCallback(
    (publish: boolean) => ({
      ...post,
      is_published: publish,
      type,
      tags:
        type === "guide" && seriesTag && !hasTag({ tags: post.tags }, seriesTag)
          ? [post.tags, seriesTag].filter(Boolean).join(", ")
          : post.tags,
      guide_section: type === "guide" && guideSection ? guideSection : null,
      guide_order:
        type === "guide" && guideOrder.trim() !== "" ? Number(guideOrder) : null,
    }),
    [post, type, seriesTag, guideSection, guideOrder],
  );

  // An unsaved draft found on mount, offered back through the banner below.
  // Held in state rather than left in storage so autosave can keep overwriting
  // the stored copy while the offer stands — whatever is typed next still has
  // to survive a reload.
  const [recoverable, setRecoverable] = useState<EditorDraft | null>(null);
  useEffect(() => {
    const stored = readEditorDraft(postId);
    if (stored && draftDiffersFrom(stored, baselineRef.current)) {
      setRecoverable(stored);
    }
  }, [postId]);

  const restoreDraft = () => {
    if (!recoverable) return;
    setPost((prev) => ({
      ...prev,
      title: recoverable.title,
      description: recoverable.description,
      content: recoverable.content,
      tags: recoverable.tags,
      slug: recoverable.slug || prev.slug,
    }));
    setRecoverable(null);
  };

  const discardDraft = () => {
    clearEditorDraft(postId);
    setRecoverable(null);
  };

  // Autosave. The local snapshot is the part that survives a reload and is
  // written for every post; the server write is deliberately narrower. A post
  // that is already published is never saved without pressing the button — a
  // stray keystroke must not edit what readers are looking at — and a post with
  // no id yet is left alone so half-typed thoughts do not create rows.
  useEffect(() => {
    const body: EditorDraftBody = {
      title: post.title,
      description: post.description,
      content: post.content,
      tags: post.tags ?? "",
      slug: post.slug,
    };
    const differs = draftDiffersFrom({ ...body, savedAt: 0 }, baselineRef.current);
    setDirtyVsServer(differs);
    if (!differs) return;

    setSaveState("dirty");
    const payload = buildPayload(false);

    const timer = window.setTimeout(async () => {
      if (loadingActionRef.current) return;
      saveEditorDraft(postId, body);

      if (isNew || !postId || post.is_published) {
        setLastSaved(new Date());
        setSaveState("saved");
        return;
      }

      setSaveState("saving");
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        baselineRef.current = body;
        setDirtyVsServer(false);
        // The server now holds it, so the local copy has nothing left to rescue.
        clearEditorDraft(postId);
        setLastSaved(new Date());
        setSaveState("saved");
      } catch {
        // Keep the local snapshot: a failed autosave is exactly when it matters.
        setSaveState("error");
      }
    }, AUTOSAVE_MS);

    return () => window.clearTimeout(timer);
  }, [
    post.title,
    post.description,
    post.content,
    post.tags,
    post.slug,
    post.is_published,
    postId,
    isNew,
    buildPayload,
  ]);

  // Leaving with the server behind. Two mechanisms, because a page can be left
  // two different ways and only one of them is ours to handle.
  //
  // A reload, a closed tab or a typed URL tears the document down, and the only
  // thing a page may do about that is `beforeunload`. The browser then shows its
  // own generic prompt — the wording is fixed and cannot be replaced with a
  // dialog of ours, by design, so that pages cannot fake a system message.
  useEffect(() => {
    if (!dirtyVsServer) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need returnValue set before they show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyVsServer]);

  // In-app navigation never unloads the document, so `beforeunload` is silent
  // for it and the App Router exposes no navigation event to hook. Catching the
  // click before the router sees it is what is left — and it means the back
  // arrow, the admin nav and any other in-app link all go through one guard.
  useEffect(() => {
    if (!dirtyVsServer) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!anchor) return;
      const href = navigationTarget(
        anchor as HTMLAnchorElement,
        window.location.href,
        event,
      );
      if (!href) return;
      event.preventDefault();
      setPendingHref(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirtyVsServer]);

  // Track writer resume for existing posts (debounced).
  useEffect(() => {
    const id = initialData?.id;
    if (isNew || !id) return;
    const t = window.setTimeout(() => {
      setWriterResume({
        postId: id,
        title: post.title,
        route: `/admin/edit/${id}`,
        updatedAt: Date.now(),
      });
    }, 2000);
    return () => window.clearTimeout(t);
  }, [isNew, initialData?.id, post.title, post.description, post.content]);

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
      // Guide chapters live at /<series>/<slug>: keep the slug flat and clean,
      // the editable input below handles collisions manually.
      const slug =
        type === "guide" ? name : `${year}/${month}/${day}/${name}-${suffix}`;
      setPost((prev) => ({ ...prev, slug }));
    }
  }, [post.title, isNew, type]);

  const handleDelete = async () => {
    setLoadingAction("delete");
    try {
      const res = await fetch(`/api/posts/${initialData?.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        clearWriterResume();
        toast.success("Post moved to trash");
        router.push("/admin");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(
          err.error || err.message || `Failed to delete (${res.status})`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSave = async (
    publish: boolean,
    action: string,
    // Where to go once the save lands, for the "save and leave" path. Replaces
    // the usual stay-in-the-editor routing rather than running after it.
    leaveTo?: string,
  ) => {
    setLoadingAction(action);
    try {
      const url = isNew ? "/api/posts" : `/api/posts/${initialData?.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(publish)),
      });

      if (res.ok) {
        baselineRef.current = {
          title: post.title,
          description: post.description,
          content: post.content,
          tags: post.tags ?? "",
          slug: post.slug,
        };
        clearEditorDraft(postId);
        setRecoverable(null);
        setSaveState("saved");
        setDirtyVsServer(false);
        if (publish) clearWriterResume();
        toast.success(publish ? "Post published" : "Draft saved");
        if (leaveTo) {
          setPendingHref(null);
          setLastSaved(new Date());
          router.push(leaveTo);
          return;
        }
        if (isNew) {
          // After creating a new post we want the URL to match the new id so
          // subsequent saves use PUT, but keep the user in the editor.
          const saved = await res.json().catch(() => null);
          const newId = saved?.id as string | undefined;
          if (newId) {
            router.replace(`/admin/edit/${newId}`);
          }
        } else {
          // Refresh server data (drafts list, lastSaved etc.) without leaving.
          router.refresh();
        }
        setLastSaved(new Date());
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(
          err.error || err.message || `Failed to save (${res.status})`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoadingAction(null);
    }
  };

  // Stay in split layout until the panel has finished sliding out, otherwise the
  // editor would snap back to full width while the board is still on screen.
  const isSplit = showTldraw || panelMounted;

  return (
    <div
      className={
        isSplit
          ? "fixed inset-0 z-40 bg-background flex flex-col pt-[36px]"
          : "min-h-[80vh]"
      }
    >
      {/* Sticky Top Header */}
      <div
        className={`${isSplit ? "flex-shrink-0" : "sticky top-[36px]"} bg-background/95 backdrop-blur border-b z-[55]`}
      >
        <div
          className={cn(
            "relative px-4 py-3 flex items-center justify-between",
            isSplit ? "w-full" : "max-w-[1280px] mx-auto w-full",
          )}
        >
          {/* Centred absolutely rather than placed in the left group: the title
              then fades in and out without shifting the save status or the
              buttons on either side. */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center px-72 md:flex">
            <span
              className={cn(
                "truncate font-serif text-sm font-semibold transition-opacity duration-200 motion-reduce:transition-none",
                titleInHeader && post.title ? "opacity-100" : "opacity-0",
              )}
            >
              {post.title}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
            </Button>
            {/* Autosave status. Published posts autosave locally only, so the
                label says where the copy actually went. */}
            {saveState !== "idle" && (
              <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                {saveState === "saving" ? (
                  <>
                    <Loader2Icon className="w-3 h-3 animate-spin" />
                    <span>đang lưu…</span>
                  </>
                ) : saveState === "dirty" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>chưa lưu</span>
                  </>
                ) : saveState === "error" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    <span>lưu server lỗi, đã giữ bản nháp trong máy</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>
                      {isNew || post.is_published ? "nháp trong máy" : "đã lưu"}
                      {lastSaved
                        ? ` ${lastSaved.toLocaleTimeString("vi-VN")}`
                        : ""}
                    </span>
                  </>
                )}
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

      {/* Leaving with the server behind, for in-app navigation. A reload or a
          closed tab cannot reach this dialog and gets the browser's own prompt. */}
      <AlertDialog
        open={pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) setPendingHref(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời khỏi trang?</AlertDialogTitle>
            <AlertDialogDescription>
              {post.is_published
                ? "Bài đã đăng, nên thay đổi mới chỉ nằm trong máy chứ chưa lên server."
                : "Có thay đổi chưa lưu lên server."}{" "}
              Bản nháp trong máy vẫn được giữ và sẽ được mời khôi phục khi bạn mở
              lại bài này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingAction}>Ở lại</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={!!loadingAction}
              onClick={() => {
                const href = pendingHref;
                setPendingHref(null);
                if (href) router.push(href);
              }}
            >
              Thoát không lưu
            </Button>
            <AlertDialogAction
              disabled={!!loadingAction}
              onClick={(event) => {
                // Hold the dialog open while the request runs: a failed save
                // must leave the author here, not silently on another page.
                event.preventDefault();
                const href = pendingHref;
                if (!href) return;
                // A published post saves as published — routing this through
                // the draft path would quietly unpublish it.
                void handleSave(
                  post.is_published,
                  post.is_published ? "save" : "save-draft",
                  href,
                );
              }}
            >
              {loadingAction ? (
                <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {post.is_published ? "Lưu rồi thoát" : "Lưu nháp rồi thoát"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom-right controls — always visible. In split mode they step left of
          the board, because tldraw parks its own watermark in that corner and
          the two were sitting on top of each other. */}
      <div
        className={cn(
          "fixed bottom-4 z-[51] flex flex-col gap-2 transition-[right] duration-300 ease-out motion-reduce:transition-none",
          isSplit && panelOpen ? "right-[calc(45%+1rem)]" : "right-4",
        )}
      >
        {showScrollTop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={scrollToTop}
                aria-label="Scroll to top"
              >
                <ArrowUpIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Scroll to top</TooltipContent>
          </Tooltip>
        )}
        {/* Layout options. Hidden in split mode, where the board owns the
            right-hand side and width/alignment have nothing to act on. */}
        {!isSplit && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Tuỳ chọn bố cục"
                  >
                    <Settings2Icon className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="left">Bố cục</TooltipContent>
            </Tooltip>
            <PopoverContent side="left" align="end" className="w-60 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="editor-toc-toggle" className="text-sm">
                  Mục lục
                </label>
                <Switch
                  id="editor-toc-toggle"
                  checked={prefs.showToc}
                  onCheckedChange={(checked) =>
                    updatePrefs({ showToc: checked })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-sm">Bề rộng</span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={prefs.width}
                  onValueChange={(value) =>
                    value && updatePrefs({ width: value as EditorWidth })
                  }
                  className="w-full"
                >
                  <ToggleGroupItem value="narrow" className="flex-1 text-xs">
                    Hẹp
                  </ToggleGroupItem>
                  <ToggleGroupItem value="wide" className="flex-1 text-xs">
                    Rộng
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-1.5">
                <span className="text-sm">Canh lề</span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={prefs.align}
                  onValueChange={(value) =>
                    value && updatePrefs({ align: value as EditorAlign })
                  }
                  className="w-full"
                >
                  <ToggleGroupItem value="center" className="flex-1 text-xs">
                    <AlignCenterIcon className="w-3.5 h-3.5 mr-1" />
                    Giữa
                  </ToggleGroupItem>
                  <ToggleGroupItem value="left" className="flex-1 text-xs">
                    <AlignLeftIcon className="w-3.5 h-3.5 mr-1" />
                    Trái
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={showTldraw ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setShowTldraw((v) => {
                  const next = !v;
                  localStorage.setItem("editor-show-tldraw", String(next));
                  return next;
                })
              }
              aria-label="Toggle tldraw"
            >
              <PenLineIcon
                className={cn(
                  "w-4 h-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
                  showTldraw && "-rotate-12",
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {showTldraw ? "Hide drawing board" : "Show drawing board"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main Content */}
      <div
        className={
          isSplit
            ? "relative flex flex-1 overflow-hidden"
            : "py-8 mx-auto max-w-[1280px] w-full px-4 flex gap-10"
        }
      >
        {/* Editor column */}
        <div
          ref={editorColumnRef}
          className={cn(
            "transition-[width] duration-300 ease-out motion-reduce:transition-none",
            // No top padding in split mode: it sits inside the scrollport, so a
            // `sticky top-0` toolbar parks *below* it and leaves a strip where
            // text scrolls past in plain view. The spacing moves onto the first
            // block instead, where it scrolls away like normal content.
            isSplit
              ? panelOpen
                ? "w-[55%] overflow-auto pt-0 pb-8 px-8 space-y-6"
                : "w-full overflow-auto pt-0 pb-8 px-8 space-y-6"
              : cn(
                  "flex-1 min-w-0 space-y-6",
                  WIDTH_CLASS[prefs.width],
                  ALIGN_CLASS[prefs.align],
                ),
          )}
        >
          {/* Unsaved-draft recovery */}
          {recoverable && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <span className="flex-1 min-w-[200px]">
                Có bản nháp chưa lưu từ{" "}
                <span className="font-mono">
                  {new Date(recoverable.savedAt).toLocaleString("vi-VN")}
                </span>
                .
              </span>
              <Button type="button" size="sm" variant="outline" onClick={restoreDraft}>
                <RotateCcwIcon className="w-3.5 h-3.5 mr-1.5" />
                Khôi phục
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={discardDraft}>
                Bỏ qua
              </Button>
            </div>
          )}

          {/* Title */}
          <div className={cn("space-y-1", isSplit && "pt-8")}>
            <div className="flex justify-end font-mono text-[10px] text-muted-foreground/60 tabular-nums">
              <span
                className={
                  post.title.length > TITLE_MAX * 0.9 ? "text-amber-500" : ""
                }
              >
                {post.title.length}/{TITLE_MAX}
              </span>
            </div>
            <textarea
              ref={titleRef}
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
              placeholder="Title"
              maxLength={TITLE_MAX}
              rows={1}
              className="block w-full text-4xl font-serif font-bold py-2 bg-transparent border-none shadow-none outline-none resize-none leading-tight placeholder:text-muted-foreground/50 [field-sizing:content]"
            />
          </div>

          {/* Description / Subtitle */}
          <div className="space-y-1">
            <div className="flex justify-end font-mono text-[10px] text-muted-foreground/60 tabular-nums">
              <span
                className={
                  post.description.length > DESCRIPTION_MAX * 0.9
                    ? "text-amber-500"
                    : ""
                }
              >
                {post.description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              value={post.description}
              onChange={(e) =>
                setPost({ ...post, description: e.target.value })
              }
              placeholder="Add a subtitle..."
              maxLength={DESCRIPTION_MAX}
              rows={1}
              className="block w-full text-lg text-muted-foreground bg-transparent border-none shadow-none outline-none resize-none leading-snug placeholder:text-muted-foreground/40 [field-sizing:content]"
            />
          </div>

          {/* Slug Preview */}
          {type === "guide" ? (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="font-mono">/{seriesTag || "series"}/</span>
              <input
                type="text"
                value={post.slug}
                onChange={(e) => setPost({ ...post, slug: e.target.value })}
                placeholder="chapter-slug"
                className="font-mono bg-muted px-2 py-1 rounded outline-none min-w-[240px] focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          ) : (
            (() => {
              const now = new Date();
              const datePrefix = `${now.getFullYear()}/${String(
                now.getMonth() + 1,
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
            })()
          )}

          {/* Type + Tags */}
          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as PostType)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="paper">Paper</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "guide" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Series</label>
                  <Select
                    value={seriesTag}
                    onValueChange={(v) => {
                      setSeriesTag(v);
                      setGuideSection("");
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Chọn series" />
                    </SelectTrigger>
                    <SelectContent>
                      {GUIDE_SERIES.map((s) => (
                        <SelectItem key={s.tag} value={s.tag}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Section</label>
                  <Select
                    value={guideSection}
                    onValueChange={setGuideSection}
                    disabled={!seriesTag}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Chọn section" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        GUIDE_SERIES.find((s) => s.tag === seriesTag)
                          ?.sections ?? []
                      ).map((sec) => (
                        <SelectItem key={sec.key} value={sec.key}>
                          {sec.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Order</label>
                  <input
                    type="number"
                    step="0.5"
                    value={guideOrder}
                    onChange={(e) => setGuideOrder(e.target.value)}
                    placeholder="1"
                    className="h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">
                Tags
                <span className="ml-2 font-normal text-xs text-muted-foreground">
                  cách nhau bằng dấu phẩy
                </span>
              </label>
              <input
                type="text"
                value={post.tags ?? ""}
                onChange={(e) => setPost({ ...post, tags: e.target.value })}
                placeholder="sưu tầm, ai, tech…"
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
              />
              {post.tags && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {post.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 rounded px-1.5 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* WYSIWYG Editor */}
          <SimpleEditor
            content={post.content}
            onChange={(content) => setPost({ ...post, content })}
            stickyTop={isSplit ? "0px" : "100px"}
          />
        </div>

        {/* tldraw panel — absolutely positioned and slid in with `transform`
            rather than animated by width. Animating width made tldraw re-measure
            its canvas every frame, and the fixed-width inner wrapper that worked
            around that was sized in `vw`, which counts the page scrollbar the
            `%` container doesn't — so the board ended up a few px wider than its
            clip and tldraw's right-hand panel got cut off. */}
        {panelMounted && (
          <div
            className={cn(
              "absolute inset-y-0 right-0 w-[45%] border-l bg-background transition-transform duration-300 ease-out motion-reduce:transition-none",
              panelOpen ? "translate-x-0" : "translate-x-full",
            )}
          >
            <Tldraw
              persistenceKey={`editor-${initialData?.id ?? "new"}`}
              colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
            />
          </div>
        )}

        {/* TOC sidebar (only in normal mode, and only when kept on) */}
        {!isSplit && prefs.showToc && (
          <aside className="hidden lg:flex flex-col shrink-0 self-start sticky top-20 w-[220px] max-h-[calc(100vh-6rem)]">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3 shrink-0">
              Mục lục
            </h3>
            <FadedScroll className="flex-1 min-h-0 pr-2">
              <EditorToc content={post.content} />
            </FadedScroll>
          </aside>
        )}
      </div>
    </div>
  );
}
