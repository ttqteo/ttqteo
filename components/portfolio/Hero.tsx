import Link from "next/link";

const STACK = [
  "Java",
  "Go",
  "TypeScript",
  "Spring Boot",
  "Kafka",
  "Kubernetes",
  "Postgres",
];

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline underline-offset-4 decoration-1 hover:text-accent transition-colors"
    >
      {children}
    </a>
  );
}

export function Hero() {
  return (
    <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
      <h1 className="font-serif text-5xl sm:text-6xl leading-[1.05] tracking-tight">
        hi, i&apos;m{" "}
        <Link
          href="/about"
          className="underline underline-offset-4 decoration-1 hover:text-accent transition-colors"
        >
          ttqteo
        </Link>
      </h1>

      <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
        backend engineer at <Ext href="http://mozox.com/">mozox</Ext> — four
        years on distributed and real-time systems across security, identity and
        IoT. currently doing my <span className="text-foreground">MIT</span> at{" "}
        <Ext href="http://uit.edu.vn/">UIT</Ext>. i write about what i build and
        what i learn.
      </p>

      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Now
        </h2>
        <ul className="space-y-2 text-base text-foreground/90">
          <li>
            — shipping an IAM platform: fine-grained RBAC/ABAC on Ory Keto, in Go
          </li>
          <li>
            — leading the backend for a real-time chat product that scales
            sideways
          </li>
        </ul>
      </div>

      <div className="mt-10 flex items-baseline justify-between gap-4 flex-wrap border-t border-border/60 pt-4">
        <p className="font-mono text-xs text-muted-foreground">
          {STACK.join(" · ")}
        </p>
        <Link
          href="/projects"
          className="font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          what i&apos;ve built →
        </Link>
      </div>
    </section>
  );
}
