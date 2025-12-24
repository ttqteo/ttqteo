import { Metadata } from "next";
import { MindmapViewer } from "./mindmap-viewer";

export const metadata: Metadata = {
  title: "mindmap",
  description:
    "Create and visualize mindmaps with Mermaid syntax. Copy and paste to Notion or other platforms.",
};

const SAMPLE_MINDMAPS = [
  {
    title: "Project Planning",
    code: `mindmap
  root((Project))
    Planning
      Requirements
      Timeline
      Resources
    Development
      Frontend
      Backend
      Database
    Testing
      Unit Tests
      Integration
      UAT
    Deployment
      Staging
      Production`,
  },
  {
    title: "Learning Path",
    code: `mindmap
  root((Learning))
    Programming
      JavaScript
        React
        Node.js
      Python
        Django
        FastAPI
    DevOps
      Docker
      Kubernetes
      CI/CD
    Cloud
      AWS
      GCP
      Azure`,
  },
];

export default function MindmapPage() {
  return (
    <div className="w-full mx-auto flex flex-col gap-6 sm:min-h-[78vh] min-h-[76vh] pt-2">
      <div className="mb-4">
        <h1 className="text-4xl sm:text-5xl font-semibold mb-2">Mindmap</h1>
      </div>

      <MindmapViewer />

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Examples</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {SAMPLE_MINDMAPS.map((sample, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{sample.title}</h3>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono">
                {sample.code}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
