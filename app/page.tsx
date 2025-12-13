import {
  SectionHeader,
  ProjectCard,
  CaseStudyCard,
} from "@/components/portfolio";
import { featuredProjects } from "@/data/projects";
import { caseStudies } from "@/data/case-studies";
import Link from "next/link";

export default function Home() {
  return (
    <div className="py-8 max-w-[600px] mx-auto">
      <div className="flex sm:min-h-[85.5vh] min-h-[85vh] flex-col items-center justify-center text-center px-2 sm:py-8 py-12">
        <h1 className="text-8xl sm:text-6xl font-bold mb-4">
          hi, i{"'"}m{" "}
          <span className="underline-offset-4 underline hover:text-destructive">
            <Link href={"/about"}>ttqteo</Link>
          </span>
        </h1>
        <p className="mb-8 sm:text-2xl text-xl max-w-[800px] text-muted-foreground italic">
          keep it simple, stupid
        </p>
        <p className="mb-8 sm:text-2xl text-xl max-w-[800px] text-muted-foreground">
          --oOo--
        </p>
        <p className="mb-8 sm:text-2xl text-xl max-w-[800px] text-muted-foreground">
          welcome to my world
        </p>
      </div>

      {/* Featured Projects */}
      <section className="py-16">
        <SectionHeader
          title="Featured Projects"
          subtitle="Open-source and production projects showcasing full-stack development, data engineering, and system design."
        />
        <div>
          {featuredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      {/* Real-World Case Studies */}
      <section className="py-16">
        <SectionHeader
          title="Real-World Case Studies"
          subtitle="Production systems built for real businesses. Private repositories - showcasing technical decisions and scale."
        />
        <div className="space-y-8">
          {caseStudies.map((caseStudy) => (
            <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
          ))}
        </div>
      </section>
    </div>
  );
}
