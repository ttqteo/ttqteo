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
    node: {
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
        {
          id: "testing",
          text: "Testing",
          children: [
            { id: "unit", text: "Unit Tests", children: [] },
            { id: "integration", text: "Integration", children: [] },
            { id: "uat", text: "UAT", children: [] },
          ],
        },
        {
          id: "deploy",
          text: "Deployment",
          children: [
            { id: "staging", text: "Staging", children: [] },
            { id: "prod", text: "Production", children: [] },
          ],
        },
      ],
    } as MindmapNode,
  },
  {
    title: "Learning Path",
    node: {
      id: "root",
      text: "Learning",
      children: [
        {
          id: "prog",
          text: "Programming",
          children: [
            {
              id: "js",
              text: "JavaScript",
              children: [
                { id: "react", text: "React", children: [] },
                { id: "node", text: "Node.js", children: [] },
              ],
            },
            {
              id: "py",
              text: "Python",
              children: [
                { id: "django", text: "Django", children: [] },
                { id: "fastapi", text: "FastAPI", children: [] },
              ],
            },
          ],
        },
        {
          id: "devops",
          text: "DevOps",
          children: [
            { id: "docker", text: "Docker", children: [] },
            { id: "k8s", text: "Kubernetes", children: [] },
            { id: "cicd", text: "CI/CD", children: [] },
          ],
        },
        {
          id: "cloud",
          text: "Cloud",
          children: [
            { id: "aws", text: "AWS", children: [] },
            { id: "gcp", text: "GCP", children: [] },
            { id: "azure", text: "Azure", children: [] },
          ],
        },
      ],
    } as MindmapNode,
  },
];
