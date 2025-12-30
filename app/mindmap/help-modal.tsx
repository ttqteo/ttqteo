"use client";

import { useState, useEffect, useMemo } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMindmapDocs } from "./actions";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface Doc {
  name: string;
  title: string;
  content: string;
}

export function MindmapHelpModal() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [mdxSource, setMdxSource] = useState<any>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      const data = await getMindmapDocs();
      setDocs(data);
      if (data.length > 0) {
        setActiveTab(data[0].name);
      }
      setLoading(false);
    };
    fetchDocs();
  }, []);

  const activeDoc = docs.find((d) => d.name === activeTab);

  // Serialize markdown content when activeDoc changes
  useEffect(() => {
    const serializeContent = async () => {
      if (activeDoc) {
        // Pre-process: Convert inline code `text` to <code>text</code>
        // This ensures code in tables and everywhere else renders correctly
        let processedContent = activeDoc.content;

        // Replace inline code backticks with HTML code tags
        processedContent = processedContent.replace(
          /`([^`]+)`/g,
          "<code>$1</code>"
        );

        const source = await serialize(processedContent, {
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeRaw as any],
            format: "md",
          },
        });
        setMdxSource(source);
      }
    };
    serializeContent();
  }, [activeDoc]);

  // Custom components for MDX
  const components = useMemo(() => {
    return {
      h1: (props: any) => (
        <h1 className="text-3xl font-bold mt-2 mb-1 pb-2 border-b" {...props} />
      ),
      h2: (props: any) => (
        <h2 className="text-2xl font-semibold mt-2 mb-1" {...props} />
      ),
      h3: (props: any) => (
        <h3 className="text-xl font-medium mt-2 mb-1" {...props} />
      ),
      p: (props: any) => (
        <p
          className="mb-3 leading-normal text-foreground dark:text-zinc-100"
          {...props}
        />
      ),
      ul: (props: any) => <ul className="mb-3" {...props} />,
      ol: (props: any) => <ol className="mb-3 list-decimal ml-6" {...props} />,
      li: (props: any) => (
        <li
          className="ml-6 list-disc mb-1 text-foreground dark:text-zinc-100 leading-normal"
          {...props}
        />
      ),
      code: ({ className, children, ...props }: any) => {
        // Check if it's inline code (no className with language-)
        const isInline = !className || !className.startsWith("language-");

        if (isInline) {
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-xs text-foreground border border-border/50 dark:bg-primary/15 dark:text-white dark:border-primary/30"
              {...props}
            >
              {children}
            </code>
          );
        }

        // Block code
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre: ({ children, ...props }: any) => (
        <div className="my-4 rounded-lg bg-muted/50 p-4 font-mono text-sm overflow-x-auto border">
          {children}
        </div>
      ),
      table: (props: any) => (
        <div className="my-4 overflow-x-auto">
          <table className="w-full border-collapse border text-sm" {...props} />
        </div>
      ),
      thead: (props: any) => <thead {...props} />,
      tbody: (props: any) => <tbody {...props} />,
      tr: (props: any) => <tr className="first:[&>th]:bg-muted" {...props} />,
      th: ({ children, ...props }: any) => (
        <th
          className="border px-3 py-2 text-left font-semibold first:pl-4 bg-muted"
          {...props}
        >
          {children}
        </th>
      ),
      td: ({ children, ...props }: any) => (
        <td
          className="border px-3 py-2 whitespace-normal break-words first:pl-4"
          {...props}
        >
          {children}
        </td>
      ),
      hr: (props: any) => <hr className="my-5 border-t" {...props} />,
      strong: (props: any) => (
        <strong className="font-bold text-foreground" {...props} />
      ),
      a: ({ href, children, ...props }: any) => {
        // Check if it's an internal doc link (starts with ./)
        if (href?.startsWith("./")) {
          const docName = href.replace("./", "").replace(".md", "");
          return (
            <button
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(docName);
              }}
              className="text-primary hover:underline cursor-pointer font-medium"
              {...props}
            >
              {children}
            </button>
          );
        }
        // External link
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            {...props}
          >
            {children}
          </a>
        );
      },
    };
  }, [setActiveTab]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm"
          title="Cách sử dụng & Ngữ nghĩa"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 overflow-hidden z-[1000]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <span className="text-foreground">Hướng dẫn Mindmap Ngữ Nghĩa</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r bg-muted/20 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {docs.map((doc) => {
                  // Add emoji icons for visual appeal
                  const getIcon = (name: string) => {
                    if (name === "README") return "📖";
                    if (name === "keyboard-shortcuts") return "⌨️";
                    if (name === "multi-root") return "🌳";
                    if (name === "node-notes") return "📝";
                    if (name === "modes") return "🎨";
                    if (name === "design-philosophy") return "💡";
                    if (name === "node-types") return "🏷️";
                    if (name === "render-rules") return "⚙️";
                    return "📄";
                  };

                  // Highlight README as recommended starting point
                  const isRecommended = doc.name === "README";

                  return (
                    <button
                      key={doc.name}
                      onClick={() => setActiveTab(doc.name)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                        activeTab === doc.name
                          ? "bg-primary text-primary-foreground font-medium shadow-sm"
                          : "hover:bg-muted hover:translate-x-0.5"
                      } ${isRecommended ? "border border-primary/30" : ""}`}
                    >
                      <span className="text-base">{getIcon(doc.name)}</span>
                      <span className="flex-1">{doc.title}</span>
                      {isRecommended && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                          start
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <ScrollArea className="flex-1">
              <div className="p-8 max-w-none prose prose-sm dark:prose-invert">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : mdxSource ? (
                  <MDXRemote {...mdxSource} components={components} />
                ) : (
                  <p className="text-muted-foreground italic">
                    Chọn một mục để xem hướng dẫn.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
