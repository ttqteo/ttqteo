import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type IndexEntryType = "experiment" | "note" | "reading" | "paper";

export interface IndexEntry {
  year: number | string;
  title: string;
  description?: string;
  role?: "solo" | "lead" | "team";
  stack?: string[];
  metric?: string;
  href: string;
  external?: boolean;
  type?: IndexEntryType;
  draft?: boolean;
  source?: "mdx" | "db";
}

const STACK_VISIBLE = 3;

export function IndexTable({ entries }: { entries: IndexEntry[] }) {
  return (
    <ul>
      {entries.map((e, i) => (
        <li key={`${e.year}-${e.title}-${i}`}>
          <IndexRow entry={e} />
        </li>
      ))}
    </ul>
  );
}

function IndexRow({ entry }: { entry: IndexEntry }) {
  const visible = (entry.stack ?? []).slice(0, STACK_VISIBLE);
  const overflow = (entry.stack?.length ?? 0) - visible.length;
  const Icon = entry.external ? ArrowUpRight : ArrowRight;

  const content = (
    <div
      className={cn(
        "group flex gap-4 items-start",
        entry.description ? "py-6" : "py-3",
        "px-2 -mx-2",
        "hover:bg-accent/5 transition-colors",
        "border-t border-border/60",
        "border-l-2 border-l-transparent hover:border-l-accent"
      )}
    >
      <span className="font-mono text-xs text-muted-foreground tabular-nums w-14 shrink-0 pt-1">
        {entry.year}
      </span>
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-4">
          <span className="text-base leading-snug">
            {entry.type && (
              <span className="font-mono text-xs text-muted-foreground mr-2">
                [{entry.type}]
              </span>
            )}
            {entry.title}
            {entry.draft && (
              <span className="ml-2 font-mono text-xs text-muted-foreground/60 border border-border px-1 py-0.5 align-middle">
                draft
              </span>
            )}
            {entry.source === "db" && (
              <span className="ml-1 font-mono text-xs text-muted-foreground/40 border border-border px-1 py-0.5 align-middle">
                db
              </span>
            )}
          </span>
          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 mt-0.5" />
        </div>
        {entry.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {entry.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
          {entry.role && <span className="uppercase tracking-wide">{entry.role}</span>}
          {visible.length > 0 && (
            <span aria-label="stack">
              {visible.join(" · ")}
              {overflow > 0 ? ` +${overflow}` : ""}
            </span>
          )}
          {entry.metric && <span>{entry.metric}</span>}
        </div>
      </div>
    </div>
  );

  if (entry.external) {
    return (
      <a href={entry.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return <Link href={entry.href}>{content}</Link>;
}
