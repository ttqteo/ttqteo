"use client";

import { Input } from "@/components/ui/input";
import { buildQueryString, type AdminPostsQuery } from "@/lib/admin-posts";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAdminNav } from "./admin-nav";

interface SearchInputProps {
  query: AdminPostsQuery;
}

/**
 * Search lives in the URL like every other filter. `replace` rather than `push`
 * keeps one back-step from unwinding the search a character at a time.
 */
export function SearchInput({ query }: SearchInputProps) {
  const { navigate } = useAdminNav();
  const [value, setValue] = useState(query.q);
  const latest = useRef(query.q);

  // Adopt the URL's term when it changes elsewhere (a sidebar link, back button),
  // but never while the user is mid-edit with a different value pending.
  useEffect(() => {
    if (query.q !== latest.current) {
      latest.current = query.q;
      setValue(query.q);
    }
  }, [query.q]);

  useEffect(() => {
    if (value === latest.current) return;
    const timer = setTimeout(() => {
      latest.current = value;
      navigate(`/admin${buildQueryString({ ...query, q: value })}`, {
        replace: true,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, query, navigate]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search title or slug…"
        className="pl-8 h-9"
      />
    </div>
  );
}
