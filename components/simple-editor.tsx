"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { CodeBlockWithLanguage } from "./extensions/code-block-language";
import { LinkCard } from "./extensions/link-card";
import { Callout } from "./extensions/callout";
import { CodeAutoPairs } from "./extensions/code-auto-pairs";
import { CodeHighlighting } from "./extensions/code-highlighting";
import { ListNesting, indentList } from "./extensions/list-nesting";
import { SmartArrows } from "./extensions/smart-arrows";
import { bareUrl, type UnfurlResult } from "@/lib/unfurl";
import { parseYoutubeUrl, youtubeEmbedSrc } from "@/lib/youtube";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  IndentIncrease,
  IndentDecrease,
  Plus,
  ChevronDown,
  Pilcrow,
  Undo,
  Redo,
  Link2,
  UnderlineIcon,
  Code2,
  ImageIcon,
  Loader2,
  ExternalLink,
  Trash2,
  Bookmark,
  MonitorPlay,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import { useImageUpload } from "./use-image-upload";

interface SimpleEditorProps {
  content: string;
  onChange: (content: string) => void;
  stickyTop?: string | null;
}

/**
 * A pasted URL that has been turned into a plain link and is now offering to
 * become something richer. `from`/`to` are live document positions, remapped on
 * every transaction below so the offer stays anchored while the author types.
 */
type PastePrompt = {
  url: string;
  from: number;
  to: number;
  loading: boolean;
  data: UnfurlResult | null;
};

/**
 * What the menu can offer with no network at all. The unfurl route supplies the
 * title, description and thumbnail, but a YouTube embed is derivable from the
 * URL by itself, so Embed stays available even when the unfurl fails.
 */
function localUnfurl(url: string): UnfurlResult {
  const video = parseYoutubeUrl(url);
  return {
    url,
    title: null,
    description: null,
    image: null,
    favicon: null,
    siteName: null,
    embedSrc: video ? youtubeEmbedSrc(video.videoId, video.start) : null,
    embeddable: Boolean(video),
  };
}

function withLocalFallback(url: string, data: UnfurlResult | null): UnfurlResult {
  const local = localUnfurl(url);
  if (!data) return local;
  return {
    ...data,
    embedSrc: data.embedSrc ?? local.embedSrc,
    embeddable: data.embeddable || local.embeddable,
  };
}

/**
 * The list the caret is actually in, meaning the innermost one.
 *
 * `editor.isActive("bulletList")` answers "is there a bullet list anywhere
 * above me", so a bullet nested under a numbered item lit both list buttons at
 * once and the toolbar looked like two mutually exclusive toggles were on.
 */
function innermostList(editor: Editor): "bulletList" | "orderedList" | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (name === "bulletList" || name === "orderedList") return name;
  }
  return null;
}

/** What the style menu shows for whatever the caret is currently in. */
function blockStyleLabel(editor: Editor): string {
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive("heading", { level })) return `Tiêu đề ${level}`;
  }
  return "Đoạn văn";
}

export function SimpleEditor({ content, onChange, stickyTop = null }: SimpleEditorProps) {
  const { uploadImage, isUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pastePrompt, setPastePrompt] = useState<PastePrompt | null>(null);
  const [promptCoords, setPromptCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        underline: false,
        // Replaced below by the same node plus a language picker.
        codeBlock: false,
      }),
      CodeBlockWithLanguage,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class:
            "underline underline-offset-2 cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg border my-4",
        },
      }),
      LinkCard,
      Callout,
      CodeAutoPairs,
      CodeHighlighting,
      ListNesting,
      SmartArrows,
    ],
    content: content || "",
    immediatelyRender: false,
    // Bắt buộc từ tiptap v3: mặc định `useEditor` KHÔNG render lại React khi có
    // transaction, nên mọi `editor.isActive(...)`, `editor.can()` và nhãn kiểu
    // khối trên thanh công cụ đọc được một lần rồi đứng hình. Gõ chữ thì chúng
    // tươi lại nhờ `onUpdate` đẩy state lên cha, nhưng chỉ di chuyển con trỏ
    // thì không có gì kích render, nên bấm vào một tiêu đề mà menu vẫn ghi
    // "Đoạn văn".
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // Block spacing lives in `.editor-prose` (globals.css) rather than in
        // `prose-*` variants: overriding only paragraphs here left every other
        // block on Tailwind Typography's own margin, which is what made the
        // gaps look uneven. Sizes and weights stay as utilities.
        class:
          "editor-prose prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[max(500px,60vh)] p-4 pb-[clamp(400px,50vh,600px)] text-base leading-normal prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h1:font-bold prose-h2:font-semibold prose-h3:font-semibold",
      },
      handlePaste: (view, event) => {
        const url = bareUrl(event.clipboardData?.getData("text/plain"));
        if (!url) return false;

        // Only a URL pasted alone on an empty line becomes a candidate for a
        // card. Dropping one into the middle of a sentence should stay a link
        // in that sentence, and inside a code block the author wants the text.
        const { $from, empty } = view.state.selection;
        if (!empty) return false;
        if (!$from.parent.isTextblock || $from.parent.type.spec.code) return false;
        if ($from.parent.textContent.trim() !== "") return false;

        // Insert the plain link first, so nothing is lost if the unfurl fails
        // or the author walks away mid-decision.
        const from = $from.pos;
        const linkMark = view.state.schema.marks.link;
        view.dispatch(
          view.state.tr
            .replaceSelectionWith(
              view.state.schema.text(
                url,
                linkMark ? [linkMark.create({ href: url })] : undefined,
              ),
              false,
            )
            .scrollIntoView(),
        );
        // Seeded with what is knowable without the network, so the menu can be
        // useful on the same frame. For YouTube that already includes the embed
        // src, which is the option most pastes are reaching for.
        setPastePrompt({
          url,
          from,
          to: from + url.length,
          loading: true,
          data: localUnfurl(url),
        });
        return true;
      },
    },
  });

  // Update editor content when prop changes (for initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  // Keep the offer anchored to its link while the author keeps writing. Without
  // remapping, typing above the link would leave the menu pointing at whatever
  // text has drifted into those positions.
  useEffect(() => {
    if (!editor) return;
    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean; mapping: { map: (pos: number, bias?: number) => number } } }) => {
      if (!transaction.docChanged) return;
      setPastePrompt((prev) => {
        if (!prev) return prev;
        const from = transaction.mapping.map(prev.from, 1);
        const to = transaction.mapping.map(prev.to, -1);
        // Typed over or deleted: the offer no longer has a subject.
        return to <= from ? null : { ...prev, from, to };
      });
    };
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  // Fetch the metadata. A failure is not an error state: the menu falls back to
  // what can be derived locally and a bookmark with only a URL is still a valid
  // card, so the author is never blocked on the network.
  useEffect(() => {
    if (!pastePrompt?.loading) return;
    const url = pastePrompt.url;
    let cancelled = false;

    void (async () => {
      let data: UnfurlResult | null = null;
      try {
        const res = await fetch("/api/admin/unfurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (res.ok) data = (await res.json()) as UnfurlResult;
      } catch {
        /* fall through to the local fallback */
      }
      if (cancelled) return;
      setPastePrompt((prev) =>
        prev && prev.url === url
          ? { ...prev, loading: false, data: withLocalFallback(url, data) }
          : prev,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [pastePrompt?.loading, pastePrompt?.url]);

  // Park the menu under the link it belongs to. Viewport coordinates, so the
  // menu is positioned fixed and escapes the editor's own scroll container.
  useEffect(() => {
    if (!editor || !pastePrompt) {
      setPromptCoords(null);
      return;
    }
    try {
      const start = editor.view.coordsAtPos(pastePrompt.from);
      const end = editor.view.coordsAtPos(pastePrompt.to);
      setPromptCoords({ top: end.bottom + 6, left: start.left });
    } catch {
      setPromptCoords(null);
    }
  }, [editor, pastePrompt]);

  useEffect(() => {
    if (!pastePrompt) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPastePrompt(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pastePrompt]);

  if (!editor) {
    return <div className="min-h-[max(500px,60vh)] animate-pulse bg-muted rounded" />;
  }

  /**
   * Swap the plain link for a card. One chain, so a single undo puts the link
   * back exactly as it was.
   */
  const applyLinkCard = (mode: "bookmark" | "embed") => {
    if (!pastePrompt) return;
    const data = pastePrompt.data;
    editor
      .chain()
      .focus()
      .deleteRange({ from: pastePrompt.from, to: pastePrompt.to })
      .insertContentAt(pastePrompt.from, {
        type: "linkCard",
        attrs: {
          url: pastePrompt.url,
          mode,
          title: data?.title ?? null,
          description: data?.description ?? null,
          image: data?.image ?? null,
          favicon: data?.favicon ?? null,
          embedSrc: data?.embedSrc ?? null,
        },
      })
      .run();
    setPastePrompt(null);
  };

  const addLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL (để trống để xoá link):", previous ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Toolbar button helper
  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    tooltip,
    children,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    tooltip: string;
    children: React.ReactNode;
  }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="h-8 px-2"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={5}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />
      <div
        className={`z-30 flex flex-wrap gap-1 p-2 bg-background/95 backdrop-blur ${stickyTop !== null ? "sticky" : ""}`}
        style={stickyTop !== null ? { top: stickyTop } : undefined}
      >
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          tooltip="Undo (⌘Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          tooltip="Redo (⌘⇧Z)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Block style in one control, the way Substack keeps its Style menu.
            Four buttons that are mutually exclusive read better as a menu
            naming the current one than as four toggles you have to inspect. */}
        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-xs font-normal"
                >
                  {blockStyleLabel(editor)}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={5}>
              Kiểu khối
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setParagraph().run()}
            >
              <Pilcrow className="w-4 h-4 mr-2" />
              Đoạn văn
            </DropdownMenuItem>
            {([1, 2, 3] as const).map((level) => (
              <DropdownMenuItem
                key={level}
                onSelect={() =>
                  editor.chain().focus().toggleHeading({ level }).run()
                }
              >
                {level === 1 ? (
                  <Heading1 className="w-4 h-4 mr-2" />
                ) : level === 2 ? (
                  <Heading2 className="w-4 h-4 mr-2" />
                ) : (
                  <Heading3 className="w-4 h-4 mr-2" />
                )}
                Tiêu đề {level}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={innermostList(editor) === "bulletList"}
          tooltip="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={innermostList(editor) === "orderedList"}
          tooltip="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          tooltip="Bold (⌘B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          tooltip="Italic (⌘I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          tooltip="Underline (⌘U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          tooltip="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          tooltip="Inline Code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive("link")}
          tooltip="Add Link"
        >
          <Link2 className="w-4 h-4" />
        </ToolbarButton>

        {/* Indent / outdent. Tab and Shift-Tab do the same thing, but a list
            nested under another list is not a discoverable feature without a
            control that says it exists. */}
        <ToolbarButton
          onClick={() => indentList(editor)}
          disabled={!editor.isActive("listItem")}
          tooltip="Thụt vào (Tab)"
        >
          <IndentIncrease className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          disabled={!editor.isActive("listItem")}
          tooltip="Thụt ra (Shift+Tab)"
        >
          <IndentDecrease className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Blocks you reach for occasionally, behind one control.
            Inline they pushed the toolbar onto a second row, which cost more
            vertical space on every screen than the clicks it saved. Formatting
            you use in every paragraph stays out here; a thing you insert once
            or twice a post does not need to. */}
        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={5}>
              Chèn
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Ảnh
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="w-4 h-4 mr-2" />
              Trích dẫn
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <Code2 className="w-4 h-4 mr-2" />
              Khối code
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleCallout("note").run()}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Callout
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="w-4 h-4 mr-2" />
              Đường kẻ ngang
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Paste offer. The link is already in the document; this only asks
          whether it should become something more. */}
      {pastePrompt && promptCoords && (
        <div
          style={{ top: promptCoords.top, left: promptCoords.left }}
          className="fixed z-[60] flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* The menu appears immediately rather than after the unfurl. Only
              Bookmark actually needs the fetched metadata, so only Bookmark
              waits; dismissing, or embedding a video whose id came from the URL
              itself, should not sit behind a network round trip. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPastePrompt(null)}
          >
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Link thường
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={pastePrompt.loading}
            onClick={() => applyLinkCard("bookmark")}
          >
            {pastePrompt.loading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 mr-1.5" />
            )}
            Bookmark
          </Button>
          {/* Embed is offered only where an iframe is known to render. Most of
              the web sends X-Frame-Options: DENY, which fails as a silent blank
              box, and a button that quietly produces nothing is worse than no
              button. */}
          {pastePrompt.data?.embeddable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => applyLinkCard("embed")}
            >
              <MonitorPlay className="w-3.5 h-3.5 mr-1.5" />
              Embed
            </Button>
          )}
        </div>
      )}

      {/* Unmounted rather than hidden while the paste offer is up. The cursor
          lands inside the link that was just inserted, so this bubble's own
          `isActive("link")` fires and the two menus stack on top of each
          other. */}
      {!pastePrompt && <LinkBubble editor={editor} />}
    </div>
  );
}

/**
 * Both handed to BubbleMenu from module scope rather than rebuilt in render.
 *
 * tiptap's BubbleMenu dispatches an `updateOptions` transaction whenever its
 * `shouldShow` or `options` prop changes identity, and this editor re-renders
 * on every transaction (`shouldRerenderOnTransaction`). Written inline, both
 * were new on every render, so each render dispatched and each dispatch
 * rendered again until React stopped it with "Maximum update depth exceeded".
 * BubbleMenu skips its first update after registering, so the loop only armed
 * after mount and fired on the next re-render — on the editor page, the first
 * scroll. `shouldShow` reads nothing but its argument, so nothing is lost by
 * lifting it out.
 */
const LINK_BUBBLE_OPTIONS = { placement: "bottom" } as const;

function linkBubbleShouldShow({ editor }: { editor: Editor }): boolean {
  return editor.isEditable && editor.isActive("link");
}

function LinkBubble({ editor }: { editor: Editor }) {
  const [href, setHref] = useState("");
  const [text, setText] = useState("");

  const lastLinkKeyRef = useRef<string>("");
  useEffect(() => {
    const sync = () => {
      if (!editor.isActive("link")) {
        lastLinkKeyRef.current = "";
        return;
      }
      const markType = editor.schema.marks.link;
      if (!markType) return;
      const doc = editor.state.doc;
      const pos = editor.state.selection.$from.pos;
      let from = pos;
      while (from > 0 && doc.rangeHasMark(from - 1, from, markType)) {
        from -= 1;
      }
      let to = pos;
      const size = doc.content.size;
      while (to < size && doc.rangeHasMark(to, to + 1, markType)) {
        to += 1;
      }
      // Only re-sync inputs when entering a different link range
      // (otherwise we'd overwrite the user's in-progress edits)
      const key = `${from}-${to}`;
      if (key === lastLinkKeyRef.current) return;
      lastLinkKeyRef.current = key;
      const attrs = editor.getAttributes("link");
      setHref((attrs.href as string) ?? "");
      setText(doc.textBetween(from, to, " "));
    };
    sync();
    editor.on("selectionUpdate", sync);
    return () => {
      editor.off("selectionUpdate", sync);
    };
  }, [editor]);

  const apply = () => {
    const trimmed = href.trim();
    if (!trimmed) {
      remove();
      return;
    }

    // Find the link range from current selection without relying on focus state
    const markType = editor.schema.marks.link;
    if (!markType) return;
    const doc = editor.state.doc;
    const pos = editor.state.selection.$from.pos;
    let from = pos;
    while (from > 0 && doc.rangeHasMark(from - 1, from, markType)) {
      from -= 1;
    }
    let to = pos;
    const size = doc.content.size;
    while (to < size && doc.rangeHasMark(to, to + 1, markType)) {
      to += 1;
    }

    const newText = text.trim();
    if (newText) {
      // Replace the link range with new text and apply link mark to it,
      // then move cursor just past the link so BubbleMenu auto-hides.
      const endPos = from + newText.length;
      const docSize = editor.state.doc.content.size;
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .insertContent(newText)
        .setTextSelection({ from, to: endPos })
        .setLink({ href: trimmed })
        .setTextSelection(Math.min(endPos + 1, docSize))
        .run();
    } else {
      const docSize = editor.state.doc.content.size;
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setLink({ href: trimmed })
        .setTextSelection(Math.min(to + 1, docSize))
        .run();
    }
    lastLinkKeyRef.current = "";
  };

  const remove = () => {
    const markType = editor.schema.marks.link;
    if (!markType) return;
    const doc = editor.state.doc;
    const pos = editor.state.selection.$from.pos;
    let from = pos;
    while (from > 0 && doc.rangeHasMark(from - 1, from, markType)) {
      from -= 1;
    }
    let to = pos;
    const size = doc.content.size;
    while (to < size && doc.rangeHasMark(to, to + 1, markType)) {
      to += 1;
    }
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .unsetLink()
      .setTextSelection(to)
      .run();
    lastLinkKeyRef.current = "";
  };

  const openExternal = () => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={linkBubbleShouldShow}
      options={LINK_BUBBLE_OPTIONS}
    >
      <div
        className="flex flex-col gap-2 rounded-md border bg-popover p-2 shadow-md w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <span className="font-mono text-[10px] text-muted-foreground w-10 shrink-0 pt-1.5">
            link
          </span>
          <textarea
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://..."
            rows={1}
            className="flex-1 min-w-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none break-all [field-sizing:content]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                apply();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            onClick={openExternal}
            disabled={!href}
            title="Mở link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-mono text-[10px] text-muted-foreground w-10 shrink-0 pt-1.5">
            text
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Display text"
            rows={1}
            className="flex-1 min-w-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none [field-sizing:content]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                apply();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={remove}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Remove
          </Button>
          <Button type="button" size="sm" className="h-7 text-xs" onClick={apply}>
            Apply
          </Button>
        </div>
      </div>
    </BubbleMenu>
  );
}
