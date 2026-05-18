"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
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
  Undo,
  Redo,
  Link2,
  UnderlineIcon,
  Code2,
  ImageIcon,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function SimpleEditor({ content, onChange, stickyTop = null }: SimpleEditorProps) {
  const { uploadImage, isUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        underline: false,
      }),
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
    ],
    content: content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-4 text-base prose-p:my-1 leading-normal prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h1:font-bold prose-h2:font-semibold prose-h3:font-semibold prose-h1:mt-6 prose-h1:mb-3 prose-h2:mt-5 prose-h2:mb-2 prose-h3:mt-4 prose-h3:mb-2",
      },
    },
  });

  // Update editor content when prop changes (for initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="min-h-[500px] animate-pulse bg-muted rounded" />;
  }

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
        className={`z-30 flex flex-wrap gap-1 p-2 border-y bg-background/95 backdrop-blur ${stickyTop !== null ? "sticky" : ""}`}
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

        {/* Headings */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          tooltip="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          tooltip="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          tooltip="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          tooltip="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
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

        {/* Image */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          tooltip="Upload Image"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Blockquote & Code Block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          tooltip="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          tooltip="Code Block"
        >
          <Code2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Horizontal Rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          tooltip="Horizontal Line"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      <LinkBubble editor={editor} />
    </div>
  );
}

function LinkBubble({ editor }: { editor: Editor }) {
  const [href, setHref] = useState("");
  const [text, setText] = useState("");

  const shouldShow = ({ editor: e }: { editor: Editor }) =>
    e.isEditable && e.isActive("link");

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
      shouldShow={shouldShow}
      options={{ placement: "bottom" }}
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
