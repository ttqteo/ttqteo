import { Metadata } from "next";
import { MindmapViewer } from "./mindmap-viewer";
import { ExampleCards } from "./example-cards";
import { SAMPLE_MINDMAPS } from "./types";

export const metadata: Metadata = {
  title: "mindmap",
  description:
    "Create and visualize mindmaps with Mermaid syntax. Copy and paste to Notion or other platforms.",
};

export default function MindmapPage() {
  return (
    <div className="w-full mx-auto flex flex-col gap-6 sm:min-h-[78vh] min-h-[76vh] pt-2">
      <MindmapViewer />

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Examples</h2>
        <ExampleCards samples={SAMPLE_MINDMAPS} />
      </div>
    </div>
  );
}
