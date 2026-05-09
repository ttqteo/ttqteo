import Link from "next/link";

const QUOTES = [
  "keep it simple, stupid.",
  "make it work, then make it right.",
  "the best code is no code.",
  "early optimization is the root of all evil.",
];

export function Footer() {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  return (
    <footer className="border-t border-border/60 mt-16 focus-mode-hidden">
      <div className="max-w-[720px] mx-auto px-4 py-10 grid grid-cols-2 gap-8 text-sm">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">
            ttqteo
          </p>
          <p className="text-muted-foreground italic">— {quote}</p>
        </div>

        <nav className="space-y-2">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            <li><Link href="/projects" className="hover:text-accent transition-colors">projects</Link></li>
            <li><Link href="/blog" className="hover:text-accent transition-colors">blog</Link></li>
            <li><Link href="/lab" className="hover:text-accent transition-colors">lab</Link></li>
            <li><Link href="/about" className="hover:text-accent transition-colors">about</Link></li>
            <li>
              <a
                href="https://github.com/ttqteo"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                github
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
