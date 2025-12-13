interface TechBadgeProps {
  tech: string;
}

export function TechBadge({ tech }: TechBadgeProps) {
  return (
    <span className="inline-flex items-center px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-secondary text-secondary-foreground border border-border">
      {tech}
    </span>
  );
}
