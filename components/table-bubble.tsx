"use client";

import { findParentNode, type ChainedCommands, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  PanelTop,
  Trash2,
  X,
} from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Cùng lý do với `LINK_BUBBLE_OPTIONS` trong simple-editor.tsx: BubbleMenu phát
 * một transaction `updateOptions` mỗi khi `shouldShow`, `options` hay
 * `getReferencedVirtualElement` đổi identity, mà editor render lại ở mọi
 * transaction. Viết inline là vòng lặp "Maximum update depth exceeded".
 */
const TABLE_BUBBLE_OPTIONS = { placement: "top-start", offset: 6 } as const;

function tableBubbleShouldShow({ editor }: { editor: Editor }): boolean {
  // Con trỏ trong một link thì LinkBubble đang mở, hai menu sẽ chồng lên nhau.
  return editor.isEditable && editor.isActive("table") && !editor.isActive("link");
}

const findTable = findParentNode((node) => node.type.name === "table");

function BubbleButton({
  label,
  onClick,
  disabled,
  active,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-7 w-7 p-0",
            destructive && "text-destructive hover:text-destructive",
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
        >
          {children}
        </Button>
      </TooltipTrigger>
      {/* Dưới chứ không trên: menu đã nằm sát header dính của trang soạn. */}
      <TooltipContent side="bottom" sideOffset={5}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Thêm, xoá hàng cột của bảng đang chứa con trỏ.
 *
 * Neo vào khung của cả bảng chứ không theo con trỏ như LinkBubble. Neo theo
 * con trỏ thì menu đè lên hàng ngay trên ô đang sửa, mà hàng đó thường là hàng
 * tiêu đề, đúng thứ cần nhìn khi điền một bảng.
 */
export function TableBubble({ editor }: { editor: Editor }) {
  const getReferencedVirtualElement = useCallback(() => {
    const table = findTable(editor.state.selection);
    if (!table) return null;
    // Với `renderWrapper` đây là `div.tableWrapper`, cùng khung với bảng.
    const dom = editor.view.nodeDOM(table.pos);
    if (!(dom instanceof HTMLElement)) return null;
    return {
      getBoundingClientRect: () => dom.getBoundingClientRect(),
      getClientRects: () => dom.getClientRects(),
      contextElement: dom,
    };
  }, [editor]);

  const run = (command: (chain: ChainedCommands) => ChainedCommands) =>
    command(editor.chain().focus()).run();

  const table = findTable(editor.state.selection);
  const hasHeaderRow = table?.node.firstChild?.firstChild?.type.name === "tableHeader";

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={tableBubbleShouldShow}
      options={TABLE_BUBBLE_OPTIONS}
      getReferencedVirtualElement={getReferencedVirtualElement}
      // Trên thanh công cụ dính của editor (z-30), dưới header trang soạn.
      className="z-40"
    >
      <div
        className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
        // Giữ focus và vùng chọn trong editor, như menu dán link.
        onMouseDown={(event) => event.preventDefault()}
      >
        <span className="px-1.5 font-mono text-[10px] text-muted-foreground">hàng</span>
        <BubbleButton label="Thêm hàng phía trên" onClick={() => run((c) => c.addRowBefore())}>
          <BetweenHorizontalStart className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Thêm hàng phía dưới" onClick={() => run((c) => c.addRowAfter())}>
          <BetweenHorizontalEnd className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          label="Xoá hàng"
          onClick={() => run((c) => c.deleteRow())}
          disabled={!editor.can().deleteRow()}
        >
          <X className="h-3.5 w-3.5" />
        </BubbleButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <span className="px-1.5 font-mono text-[10px] text-muted-foreground">cột</span>
        <BubbleButton label="Thêm cột bên trái" onClick={() => run((c) => c.addColumnBefore())}>
          <BetweenVerticalStart className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Thêm cột bên phải" onClick={() => run((c) => c.addColumnAfter())}>
          <BetweenVerticalEnd className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          label="Xoá cột"
          onClick={() => run((c) => c.deleteColumn())}
          disabled={!editor.can().deleteColumn()}
        >
          <X className="h-3.5 w-3.5" />
        </BubbleButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <BubbleButton
          label="Hàng tiêu đề"
          onClick={() => run((c) => c.toggleHeaderRow())}
          active={hasHeaderRow}
        >
          <PanelTop className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Xoá bảng" onClick={() => run((c) => c.deleteTable())} destructive>
          <Trash2 className="h-3.5 w-3.5" />
        </BubbleButton>
      </div>
    </BubbleMenu>
  );
}
