import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  children,
}: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h2>
      {subtitle && (
        <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
