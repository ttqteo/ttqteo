import { IndexTable } from "@/components/portfolio/IndexTable";
import { projectIndex } from "@/data/projects";

export const metadata = { title: "projects" };

export default function ProjectsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-4xl">Projects</h1>
        <p className="mt-2 text-muted-foreground">
          Open-source and personal projects.
        </p>
      </header>
      <IndexTable entries={projectIndex} />
    </div>
  );
}
