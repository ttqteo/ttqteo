import Link from "next/link";

export function Hero() {
  return (
    <section className="py-16 sm:py-24">
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
        engineer at{" "}
        <a
          href="http://mozox.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-4 decoration-1 hover:text-accent transition-colors"
        >
          mozox
        </a>
        , currently doing my{" "}
        <span className="text-foreground">MIT</span> at{" "}
        <a
          href="http://uit.edu.vn/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-4 decoration-1 hover:text-accent transition-colors"
        >
          UIT
        </a>. i write about what i
        build and what i learn.
      </p>

      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Now
        </h2>
        <ul className="space-y-2 text-base text-foreground/90">
          <li>
            — building{" "}
            <a
              href="https://github.com/ttqteo/neurite"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-1 hover:text-accent transition-colors"
            >
              neurite
            </a>
            , an AI-native knowledge workspace
          </li>
          <li className="text-muted-foreground">— learning …</li>
          <li className="text-muted-foreground">— reading …</li>
        </ul>
      </div>
    </section>
  );
}
