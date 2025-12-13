import { CaseStudy } from "@/data/case-studies";
import { TechBadge } from "./TechBadge";

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  return (
    <div className="border rounded-lg p-6 sm:p-8 hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-2xl sm:text-3xl font-bold mb-2">
          {caseStudy.title}
        </h3>
        <p className="text-base sm:text-lg text-muted-foreground">
          {caseStudy.tagline}
        </p>
      </div>

      {/* Problem */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2 text-destructive">Problem</h4>
        <p className="text-sm text-muted-foreground">{caseStudy.problem}</p>
      </div>

      {/* Role */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">My Role</h4>
        <p className="text-sm text-muted-foreground">{caseStudy.role}</p>
      </div>

      {/* Technical Decisions */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">Technical Decisions</h4>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          {caseStudy.technicalDecisions.map((decision, idx) => (
            <li key={idx}>{decision}</li>
          ))}
        </ul>
      </div>

      {/* Scale */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold mb-2 text-primary">
          Scale & Production
        </h4>
        <p className="text-sm text-muted-foreground">{caseStudy.scale}</p>
      </div>

      {/* Tech Stack */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Tech Stack</h4>
        <div className="flex flex-wrap gap-2">
          {caseStudy.techStack.map((tech) => (
            <TechBadge key={tech} tech={tech} />
          ))}
        </div>
      </div>
    </div>
  );
}
