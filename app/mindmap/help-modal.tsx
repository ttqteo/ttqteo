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
import { Typography } from "@/components/typography";
import { getMindmapDocs } from "./actions";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import Pre from "@/components/markdown/pre";

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
        // We rely on 'format: mdx' and remarkGfm to parse tables properly.
        // No manual pre-processing needed as Typography component handles styling (including code blocks)
        const source = await serialize(activeDoc.content, {
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            format: "mdx",
          },
        });
        setMdxSource(source);
      }
    };
    serializeContent();
  }, [activeDoc]);

  // Custom components for MDX
  // We only need to override 'a' for internal navigation.
  // Styling is handled by Typography component.
  const components = useMemo(
    () => ({
      pre: Pre,
      a: ({ href, children, ...props }: any) => {
        // Check if it's an internal doc link (starts with ./)
        if (href?.startsWith("./")) {
          const docName = href
            .replace("./", "")
            .replace(".mdx", "")
            .replace(".md", "");
          return (
            <button
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(docName);
              }}
              className="font-medium hover:underline text-primary"
              {...props}
            >
              {children}
            </button>
          );
        }
        // External link
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      },
      // Optional: If you want to use shadcn Table components, you can map them here.
      // But Tailwind Typography (prose) handles HTML tables reasonably well.
      // If needed, we can add table customizations later.
    }),
    [setActiveTab]
  );

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
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : mdxSource ? (
                  <Typography>
                    <MDXRemote {...mdxSource} components={components} />
                  </Typography>
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
