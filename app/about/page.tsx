import { CurrentlyBlock } from "@/components/portfolio/CurrentlyBlock";

export const metadata = { title: "about" };

const SKILL_GROUPS: { label: string; items: string[] }[] = [
  { label: "languages", items: ["TypeScript", "Python", "Go", "Java"] },
  {
    label: "backend",
    items: [
      "Spring Boot",
      "NestJS",
      "FastAPI",
      "Express",
      "JPA/Hibernate",
      "REST/OpenAPI",
    ],
  },
  { label: "frontend", items: ["Next.js", "React", "React Native"] },
  {
    label: "security & access",
    items: [
      "OAuth2/JWT",
      "RBAC/ABAC",
      "Ory Keto/Oathkeeper",
      "audit logging",
      "SIEM/SOC",
    ],
  },
  {
    label: "data & messaging",
    items: [
      "Postgres",
      "MongoDB",
      "Redis",
      "Kafka",
      "Pulsar",
      "Socket.IO",
      "LiveKit",
    ],
  },
  {
    label: "infra",
    items: [
      "Docker",
      "Kubernetes",
      "Helm",
      "ArgoCD",
      "GitHub Actions",
      "Prometheus/Grafana",
      "ELK",
      "AWS",
      "Nginx",
      "Linux",
    ],
  },
  {
    label: "architecture",
    items: [
      "microservices",
      "event-driven",
      "multi-tenant SaaS",
      "real-time systems",
      "observability",
      "system design",
    ],
  },
];

export default function AboutPage() {
  return (
    <article className="max-w-[680px] mx-auto px-4 py-12 prose dark:prose-invert">
      <h1 className="text-4xl mb-6 not-prose">About</h1>

      <p>I&apos;m Tran Tu Quang.</p>

      <p>
        Backend engineer, 4+ years on distributed and real-time systems:
        cybersecurity, IAM, IoT, product platforms. Mostly Java/Spring Boot and
        Go, event-driven with Kafka, OAuth2/JWT and fine-grained authorization,
        ELK-based observability, plus the frontend work when a feature needs it.
      </p>

      <CurrentlyBlock />

      <h2 className="not-prose text-2xl mt-12 mb-4">Education</h2>
      <ul className="font-mono text-sm space-y-2 not-prose">
        <li>
          <span className="text-muted-foreground">2025–2027</span> · Master of
          Information Technology @ UIT-VNU
        </li>
        <li>
          <span className="text-muted-foreground">2018–2022</span> · BSc
          Computer and Embedded System @ HCMUS
        </li>
        <li>
          <span className="text-muted-foreground">2023–2025</span> · BA English
          Literature @ Hue University
        </li>
      </ul>

      <h2 className="not-prose text-2xl mt-12 mb-4">Skills</h2>
      <dl className="font-mono text-sm not-prose space-y-3">
        {SKILL_GROUPS.map((group) => (
          <div
            key={group.label}
            className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4"
          >
            <dt className="text-muted-foreground">{group.label}</dt>
            <dd className="ml-0 leading-relaxed">{group.items.join(" · ")}</dd>
          </div>
        ))}
      </dl>

      <h2 className="not-prose text-2xl mt-12 mb-4">Contact</h2>
      <ul className="not-prose space-y-1">
        <li>
          <a
            href="mailto:ttuquang282@gmail.com"
            className="hover:text-accent transition-colors"
          >
            ttuquang282@gmail.com
          </a>
        </li>
        <li>
          <a
            href="https://github.com/ttqteo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            github/ttqteo
          </a>
        </li>
        <li>
          <a
            href="https://www.linkedin.com/in/ttqteo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            linkedin/ttqteo
          </a>
        </li>
      </ul>
    </article>
  );
}
