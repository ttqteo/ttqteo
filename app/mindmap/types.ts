/**
 * Core type definitions for mindmap data structure
 */

export type SemanticType =
  | "Root"
  | "Concept"
  | "Idea"
  | "Explanation"
  | "Example"
  | "Warning"
  | "Section";

export interface MindmapNode {
  id: string;
  text: string;
  children: MindmapNode[];
  isDraft?: boolean; // true = uncommitted draft node
  isCollapsed?: boolean; // true = children are hidden
  semanticType?: SemanticType;
  note?: string; // Optional detailed note/annotation
}

/**
 * A single mindmap with metadata
 */
export interface MindmapItem {
  id: string; // UUID
  name: string; // Display name
  trees: MindmapNode[]; // Array of root nodes
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  renderMode?: "brainstorm" | "study" | "classic";
  config?: Record<string, any>; // Mermaid frontmatter config
}

/**
 * Storage format for multiple mindmaps
 */
export interface MindmapStorage {
  currentId: string; // Active mindmap ID
  mindmaps: MindmapItem[]; // All mindmaps
  syncCode?: string; // 10-character code for anonymous sync
}

/**
 * Default mindmap with a single root node
 */
export const DEFAULT_MINDMAP: MindmapNode = {
  id: "root",
  text: "...",
  children: [],
};

/**
 * Sample mindmaps for demonstration
 */
export const SAMPLE_MINDMAPS = [
  {
    title: "Project Planning",
    trees: [
      {
        id: "root",
        text: "Project",
        children: [
          {
            id: "planning",
            text: "Planning",
            children: [
              { id: "req", text: "Requirements", children: [] },
              { id: "timeline", text: "Timeline", children: [] },
              { id: "resources", text: "Resources", children: [] },
            ],
          },
          {
            id: "dev",
            text: "Development",
            children: [
              { id: "fe", text: "Frontend", children: [] },
              { id: "be", text: "Backend", children: [] },
              { id: "db", text: "Database", children: [] },
            ],
          },
        ],
      },
    ] as MindmapNode[],
  },
  {
    title: "Multi-root Example",
    trees: [
      {
        id: "root1",
        text: "Frontend Tech",
        children: [
          { id: "react", text: "React", children: [] },
          { id: "vue", text: "Vue", children: [] },
        ],
      },
      {
        id: "root2",
        text: "Backend Tech",
        children: [
          { id: "node", text: "Node.js", children: [] },
          { id: "go", text: "Go", children: [] },
        ],
      },
    ] as MindmapNode[],
  },
];
