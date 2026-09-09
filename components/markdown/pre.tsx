import { ComponentProps } from "react";
import Copy from "./copy";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { MERMAID_LANGUAGE } from "@/lib/mermaid";

const LANGUAGE = /(?:^|\s)language-([\w-]+)/;

export default function Pre({
  children,
  raw,
  ...rest
}: ComponentProps<"pre"> & { raw?: string }) {
  // rehype-prism-plus chép ngôn ngữ của fence lên chính thẻ `<pre>`, đó là chỗ
  // duy nhất một component map cho `pre` đọc được nó. `raw` thì do preProcess
  // trong lib/markdown.ts đính vào, và với mermaid nó là thứ bắt buộc: children
  // lúc này đã bị prism băm thành span, không còn là source vẽ được.
  const language = LANGUAGE.exec(String(rest.className ?? ""))?.[1];
  if (language === MERMAID_LANGUAGE && raw) {
    return <MermaidDiagram source={raw} />;
  }

  return (
    <div className="my-5 relative">
      <div className="absolute top-3 right-2.5 z-10 sm:block hidden">
        <Copy content={raw!} />
      </div>
      <div className="relative">
        <pre {...rest} className="p-4 pt-12 rounded-lg overflow-x-auto">
          {children}
        </pre>
      </div>
    </div>
  );
}
