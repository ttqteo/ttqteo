"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Sample {
  title: string;
  code: string;
}

export function ExampleCards({ samples }: { samples: Sample[] }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {samples.map((sample, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">{sample.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(sample.code, index)}
              className="h-7 w-7"
              title={copiedIndex === index ? "Copied!" : "Copy code"}
            >
              {copiedIndex === index ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono">
            {sample.code}
          </pre>
        </div>
      ))}
    </div>
  );
}
