"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buildQueryString, type ViewKey } from "@/lib/admin-posts";
import { SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { FILTER_GROUPS } from "./filter-groups";
import { FilterLink } from "./filter-link";
import { usePostsQuery } from "./posts-query";

/**
 * The phone's filter, next to New rather than above the table.
 *
 * The strip this replaces put ten options on screen at all times, which is a
 * lot of chrome for a control that is usually left alone. The trigger names the
 * active view instead, so the one thing worth knowing at a glance stays visible
 * and the rest is one tap away.
 */
export function FilterSheet({ counts }: { counts: Record<ViewKey, number> }) {
  const { query, setQuery } = usePostsQuery();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontalIcon className="w-4 h-4 mr-2" />
          {query.view}
          <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
            {counts[query.view]}
          </span>
        </Button>
      </SheetTrigger>

      {/* Bottom sheet: the options end up near the thumb rather than under the
          far corner the trigger sits in. */}
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Lọc bài</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-2">
          {FILTER_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.views.map((view) => (
                  <FilterLink
                    key={view}
                    variant="chip"
                    href={`/admin${buildQueryString({ ...query, view })}`}
                    label={view}
                    count={counts[view]}
                    active={query.view === view}
                    onSelect={() => {
                      setQuery({ view });
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
