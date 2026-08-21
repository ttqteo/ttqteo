import { cn } from "@/lib/utils";

export interface PubLink {
  /** Short lowercase label: pdf, code, slides, doi, bibtex. */
  label: string;
  href: string;
}

export interface Publication {
  id: string;
  /** Withheld while a double-blind submission is under review. */
  title?: string;
  /** Withheld alongside the title; `SELF` is bolded when present. */
  authors?: string[];
  venue: string;
  year: number | string;
  /** "Under submission", "To appear", "Major revision", etc. */
  status?: string;
  note?: string;
  links?: PubLink[];
}

export interface ServiceEntry {
  role: string;
  venue: string;
  years: string;
}

export function PublicationList({
  entries,
  self,
}: {
  entries: Publication[];
  self: string;
}) {
  return (
    <ul>
      {entries.map((e) => (
        <li key={e.id}>
          <PublicationRow entry={e} self={self} />
        </li>
      ))}
    </ul>
  );
}

function PublicationRow({ entry, self }: { entry: Publication; self: string }) {
  return (
    <div
      className={cn(
        "flex gap-4 items-start py-6 px-2 -mx-2",
        "border-t border-border/60",
      )}
    >
      <span className="font-mono text-xs text-muted-foreground tabular-nums w-14 shrink-0 pt-1">
        {entry.year}
      </span>
      <div className="flex-grow min-w-0">
        {entry.title ? (
          <span className="text-base leading-snug">{entry.title}</span>
        ) : (
          <span className="text-base leading-snug text-muted-foreground italic">
            Title withheld during review
          </span>
        )}
        {entry.status && (
          <span className="ml-2 font-mono text-xs uppercase tracking-wide text-muted-foreground/70 border border-border px-1 py-0.5 align-middle">
            {entry.status}
          </span>
        )}

        {entry.authors && entry.authors.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {entry.authors.map((a, i) => (
              <span key={a}>
                {a === self ? <strong className="text-foreground">{a}</strong> : a}
                {i < entry.authors!.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        )}

        {entry.note && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {entry.note}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
          <span>{entry.venue}</span>
          {entry.links?.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors underline underline-offset-2"
            >
              [{l.label}]
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ServiceList({ entries }: { entries: ServiceEntry[] }) {
  return (
    <ul>
      {entries.map((e) => (
        <li
          key={`${e.role}-${e.venue}-${e.years}`}
          className="flex gap-4 items-baseline py-3 px-2 -mx-2 border-t border-border/60"
        >
          <span className="font-mono text-xs text-muted-foreground tabular-nums w-14 shrink-0">
            {e.years}
          </span>
          <span className="text-sm">
            {e.venue}
            <span className="text-muted-foreground"> · {e.role}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
