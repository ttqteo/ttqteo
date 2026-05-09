"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface AdminNavLinkProps {
  href: string;
  exact?: boolean;
  children: ReactNode;
}

export function AdminNavLink({ href, exact = false, children }: AdminNavLinkProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 transition-colors ${
        active
          ? "text-white bg-zinc-800/70 px-2 py-1 rounded-md"
          : "hover:text-zinc-300"
      }`}
    >
      {children}
    </Link>
  );
}
