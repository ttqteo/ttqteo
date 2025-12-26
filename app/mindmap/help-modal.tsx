"use client";

import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";
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

interface Doc {
  name: string;
  title: string;
  content: string;
}

export function MindmapHelpModal() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");

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

  // Enhanced markdown renderer for the modal
  const renderMarkdown = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    const processInline = (text: string) => {
      // Handle bold **text**
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Handle code `text`
        const codeParts = part.split(/(`.*?`)/g);
        return codeParts.map((codePart, codeIndex) => {
          if (codePart.startsWith("`") && codePart.endsWith("`")) {
            return (
              <code
                key={`${index}-${codeIndex}`}
                className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs"
              >
                {codePart.slice(1, -1)}
              </code>
            );
          }
          return codePart;
        });
      });
    };

    while (i < lines.length) {
      const line = lines[i];

      // Headers
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={i} className="text-3xl font-bold mt-8 mb-6 pb-2 border-b">
            {line.slice(2)}
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className="text-2xl font-semibold mt-8 mb-4">
            {line.slice(3)}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={i} className="text-xl font-medium mt-6 mb-3">
            {line.slice(4)}
          </h3>
        );
        i++;
        continue;
      }

      // Code blocks (```)
      if (line.startsWith("```")) {
        const language = line.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <div
            key={i}
            className="my-4 rounded-lg bg-muted/50 p-4 font-mono text-sm overflow-x-auto border"
          >
            <pre>
              <code>{codeLines.join("\n")}</code>
            </pre>
          </div>
        );
        i++;
        continue;
      }

      // Tables
      if (line.trim().startsWith("|") && lines[i + 1]?.trim().startsWith("|")) {
        const rows = [];
        while (i < lines.length && line.trim().startsWith("|")) {
          const cells = lines[i]
            .split("|")
            .filter(
              (c) =>
                c.trim() !== "" ||
                (lines[i].startsWith("|") && lines[i].endsWith("|"))
            );

          // Basic check for table content or divider
          const isDivider = lines[i].includes("---") && lines[i].includes("|");
          if (isDivider) {
            i++;
            continue;
          }

          // Clean up cells (remove first/last empty if they come from splitting | text |)
          const cleanCells = lines[i]
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => {
              if (idx === 0 && c === "") return false;
              if (idx === arr.length - 1 && c === "") return false;
              return true;
            });

          rows.push(cleanCells);
          i++;
          if (!lines[i]?.trim().startsWith("|")) break;
        }

        if (rows.length > 0) {
          elements.push(
            <div key={i} className="my-6 overflow-x-auto">
              <table className="w-full border-collapse border text-sm">
                <thead>
                  <tr className="bg-muted">
                    {rows[0].map((cell, idx) => (
                      <th
                        key={idx}
                        className="border p-2 text-left font-semibold"
                      >
                        {processInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, idx) => (
                        <td
                          key={idx}
                          className="border p-2 whitespace-normal break-words"
                        >
                          {processInline(cell || "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        elements.push(
          <li
            key={i}
            className="ml-6 list-disc mb-2 text-muted-foreground leading-relaxed"
          >
            {processInline(line.trim().slice(2))}
          </li>
        );
        i++;
        continue;
      }

      // Separator
      if (line.trim() === "---") {
        elements.push(<hr key={i} className="my-8 border-t" />);
        i++;
        continue;
      }

      // Plain paragraphs
      if (line.trim() !== "") {
        elements.push(
          <p key={i} className="mb-4 leading-relaxed text-muted-foreground">
            {processInline(line)}
          </p>
        );
      } else {
        elements.push(<div key={i} className="h-2" />);
      }
      i++;
    }
    return elements;
  };

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
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Hướng dẫn Mindmap Ngữ Nghĩa
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r bg-muted/20 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {docs.map((doc) => (
                  <button
                    key={doc.name}
                    onClick={() => setActiveTab(doc.name)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === doc.name
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    {doc.title}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <ScrollArea className="flex-1">
              <div className="p-8 max-w-full">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : activeDoc ? (
                  <Typography>
                    <div className="markdown-body">
                      {renderMarkdown(activeDoc.content)}
                    </div>
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
