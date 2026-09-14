"use client";

import { useEffect, useState } from "react";
import CodeBlock from "@tiptap/extension-code-block";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { gutterText } from "@/lib/code-gutter";
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
  const [previewSource, setPreviewSource] = useState(node.textContent);

  useEffect(() => {
    if (!preview) return;
    // Node view được update lại ở mỗi lần gõ, nên nếu đưa thẳng
    // `node.textContent` xuống thì mermaid parse lại từng ký tự, và phần lớn
    // trạng thái giữa chừng không parse được nên sơ đồ nhấp nháy qua lại với
    // dòng báo lỗi. 300ms đủ để gõ xong một dòng mà chưa thấy chờ.
    const id = window.setTimeout(() => setPreviewSource(node.textContent), 300);
    return () => window.clearTimeout(id);
  }, [node.textContent, preview]);

  const togglePreview = () => {
    // Lúc bật lên thì lấy nội dung hiện tại ngay: chờ hết 300ms, hoặc tệ hơn
    // là hiện lại bản source từ lần mở trước, đều đọc như bị treo.
    if (!preview) setPreviewSource(node.textContent);
    setPreview((on) => !on);
  };

  return (
    <NodeViewWrapper className="code-block-shell">
      {/* Kept out of the editable flow: without this, clicking a control moves
          the selection into the block and typing goes into the code. */}
      <div className="code-block-controls" contentEditable={false} suppressContentEditableWarning>
        {isMermaid && (
          <button
            type="button"
            className="code-block-preview-toggle"
            onClick={togglePreview}
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
        {/* Số dòng. Ngoài contentDOM nên không bao giờ vào nội dung bài. Đếm
            cả dòng trống cuối: ProseMirror vẫn vẽ nó để con trỏ có chỗ đứng. */}
        <span
          className="code-gutter"
          contentEditable={false}
          suppressContentEditableWarning
          aria-hidden="true"
        >
          {gutterText(node.textContent)}
        </span>
        {/* The tag parameter is explicit because `as` is wrapped in NoInfer,
            so it cannot be deduced from the prop and would default to div. */}
        <NodeViewContent<"code"> as="code" />
      </pre>
      {/* Sơ đồ nằm dưới code chứ không thay chỗ nó: ProseMirror cần contentDOM
          ở nguyên trong document, giấu đi là mời lỗi toạ độ con trỏ. Vẽ theo
          bản source đã hoãn ở trên, nên nó tự bắt kịp khi ngừng gõ. */}
      {isMermaid && preview && (
        <div className="code-block-preview" contentEditable={false} suppressContentEditableWarning>
          <MermaidDiagram source={previewSource} />
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
