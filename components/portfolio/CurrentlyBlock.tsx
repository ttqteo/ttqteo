import { currently } from "@/data/currently";

export function CurrentlyBlock() {
  return (
    <section aria-labelledby="currently-heading" className="py-8">
      <h2
        id="currently-heading"
        className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3"
      >
        Currently
      </h2>
      <ul className="space-y-1.5">
        {currently.lines.map((line) => (
          <li key={line} className="text-base leading-relaxed">
            <span className="text-muted-foreground mr-2">—</span>
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
