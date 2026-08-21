import {
  PublicationList,
  ServiceList,
} from "@/components/portfolio/PublicationList";
import {
  RESEARCH_UPDATED,
  SELF,
  publications,
  service,
  underSubmission,
} from "@/data/research";

export const metadata = { title: "research" };

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
      {title}
    </h2>
  );
}

export default function ResearchPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 py-12">
      <header className="mb-10">
        <h1 className="text-4xl">Research</h1>
        <p className="mt-2 text-muted-foreground">
          Software supply-chain security, vulnerability reproduction, and the
          evaluation methodology around both.
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">
          last updated {RESEARCH_UPDATED}
        </p>
      </header>

      {publications.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Publications" />
          <PublicationList entries={publications} self={SELF} />
        </section>
      )}

      {underSubmission.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Under submission" />
          <PublicationList entries={underSubmission} self={SELF} />
        </section>
      )}

      {service.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Service" />
          <ServiceList entries={service} />
        </section>
      )}
    </div>
  );
}
