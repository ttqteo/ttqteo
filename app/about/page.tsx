import { CurrentlyBlock } from "@/components/portfolio/CurrentlyBlock";

export const metadata = { title: "about" };

export default function AboutPage() {
  return (
    <article className="max-w-[680px] mx-auto px-4 py-12 prose dark:prose-invert">
      <h1 className="text-4xl mb-6 not-prose">About</h1>

      <p>I&apos;m Tran Tu Quang.</p>

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
      <p className="font-mono text-sm not-prose leading-relaxed">
        TypeScript · Python · Go · Java · Next.js · NestJS · React Native ·
        Spring Boot · FastAPI · Postgres · MongoDB · Redis · Kafka · Pulsar ·
        Socket.IO · LiveKit · Docker · Kubernetes · AWS
      </p>

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
