import { Project } from "@/data/projects";
import { ExternalLink, Github, Package, BookOpen } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  // Show first 3 features as bullet points
  const bulletPoints = project.features.slice(0, 3);

  return (
    <div className="group py-6 border-b border-border/50 last:border-b-0">
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + Links */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold group-hover:text-primary transition-colors">
            {project.title}
          </h3>
          {project.isFlagship && (
            <span className="text-xs text-primary/80">★</span>
          )}

          {/* Links inline */}
          <div className="flex items-center gap-1.5 ml-auto">
            {project.links.github && (
              <Link
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
              </Link>
            )}
            {project.links.npm && (
              <Link
                href={project.links.npm}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Package className="w-3.5 h-3.5" />
              </Link>
            )}
            {project.links.docs && (
              <Link
                href={project.links.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </Link>
            )}
            {project.links.live && (
              <Link
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Bullet Points */}
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {bulletPoints.map((point, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              <span className="line-clamp-1">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
