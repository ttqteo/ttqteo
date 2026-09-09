"use client";

import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePostsQuery } from "./posts-query";

/**
 * Search still lands in the URL like every other filter, but it filters the
 * list already in memory, so the debounce is only there to keep the address bar
 * from gaining an entry per keystroke. `replace` keeps one back-step from
 * unwinding the term a character at a time.
 */
export function SearchInput() {
  const { query, setQuery } = usePostsQuery();
  const [value, setValue] = useState(query.q);
  const latest = useRef(query.q);

  // Adopt the query's term when it changes elsewhere (a filter, the back
  // button), but never while the user is mid-edit with a different value.
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
      setQuery({ q: value }, { replace: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [value, setQuery]);

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
