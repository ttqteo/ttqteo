"use client";

import { useState } from "react";
import CodeBlock from "@tiptap/extension-code-block";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { MERMAID_LANGUAGE } from "@/lib/mermaid";

/**
 * Offered in the picker. Deliberately short: a list long enough to need
 * scrolling costs more to use than typing the language would, and anything
 * missing still round-trips because the value is only ever a class name.
 */
export const CODE_LANGUAGES = [
  "bash",
  "c",
  "cpp",
  "csharp",
  "css",
  "diff",
  "docker",
  "go",
  "html",
  "java",
  "javascript",
  "json",
  "kotlin",
  "markdown",
  "mermaid",
  "php",
  "python",
  "ruby",
  "rust",
  "sql",
  "tsx",
  "typescript",
  "yaml",
] as const;

/**
 * A code block with its language on the block itself.
 *
 * Only the editor sees this view. What gets stored is still whatever
 * `CodeBlock.renderHTML` writes — `<pre><code class="language-java">` — so the
 * picker is really just a nicer way to set that one class, and a block written
 * before this existed keeps working with no language set.
 */
function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = (node.attrs.language as string | null) ?? "";
  const isMermaid = language === MERMAID_LANGUAGE;
  const [preview, setPreview] = useState(false);

  return (
    <NodeViewWrapper className="code-block-shell">
      {/* Kept out of the editable flow: without this, clicking a control moves
          the selection into the block and typing goes into the code. */}
      <div className="code-block-controls" contentEditable={false} suppressContentEditableWarning>
        {isMermaid && (
          <button
            type="button"
            className="code-block-preview-toggle"
            onClick={() => setPreview((on) => !on)}
          >
            {preview ? "ẩn sơ đồ" : "xem sơ đồ"}
          </button>
        )}
        <select
          className="code-block-lang"
          value={language}
          disabled={!editor.isEditable}
          aria-label="Ngôn ngữ của khối code"
          onChange={(event) => updateAttributes({ language: event.target.value })}
        >
          <option value="">plain</option>
          {CODE_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <pre>
        {/* The tag parameter is explicit because `as` is wrapped in NoInfer,
            so it cannot be deduced from the prop and would default to div. */}
        <NodeViewContent<"code"> as="code" />
      </pre>
      {/* Sơ đồ nằm dưới code chứ không thay chỗ nó: ProseMirror cần contentDOM
          ở nguyên trong document, giấu đi là mời lỗi toạ độ con trỏ. Vẽ theo
          `node.textContent` nên tắt rồi bật lại là thấy bản mới nhất. */}
      {isMermaid && preview && (
        <div className="code-block-preview" contentEditable={false} suppressContentEditableWarning>
          <MermaidDiagram source={node.textContent} />
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const CodeBlockWithLanguage = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
