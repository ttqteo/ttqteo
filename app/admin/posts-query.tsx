"use client";

import {
  DEFAULT_QUERY,
  buildQueryString,
  parseQuery,
  type AdminPostsQuery,
} from "@/lib/admin-posts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PostsQueryContext = {
  query: AdminPostsQuery;
  setQuery: (
    patch: Partial<AdminPostsQuery>,
    opts?: { replace?: boolean },
  ) => void;
};

const Ctx = createContext<PostsQueryContext>({
  query: DEFAULT_QUERY,
  setQuery: () => {},
});

export const usePostsQuery = () => useContext(Ctx);

function queryFromLocation(): AdminPostsQuery {
  const params = new URLSearchParams(window.location.search);
  return parseQuery(Object.fromEntries(params.entries()));
}

/**
 * Which view, sort and search term are showing.
 *
 * This used to be the URL alone, with every click going through `router.push`.
 * The admin page is `force-dynamic` and its loader reads *all* posts on every
 * request — the counts need the whole set — so changing a filter meant a round
 * trip to Supabase for a list the browser was already holding. Filtering is
 * local now and the URL is written with the native history API, which Next
 * picks up without re-running the route.
 */
export function PostsQueryProvider({
  initialQuery,
  children,
}: {
  initialQuery: AdminPostsQuery;
  children: ReactNode;
}) {
  const [query, setState] = useState(initialQuery);

  // Mirrored so `setQuery` can build the next value without the state updater,
  // which must stay free of the history side effect below.
  const latest = useRef(query);
  latest.current = query;

  const setQuery = useCallback<PostsQueryContext["setQuery"]>((patch, opts) => {
    const next = { ...latest.current, ...patch };
    const url = `/admin${buildQueryString(next)}`;
    // `replace` for search, so one back-step does not unwind it a character at
    // a time; `push` for everything else, so back walks the filters.
    if (opts?.replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setState(next);
  }, []);

  // Back and forward move between the entries pushed above, so on popstate the
  // state has to follow the URL rather than the other way round.
  useEffect(() => {
    const onPop = () => setState(queryFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return <Ctx.Provider value={{ query, setQuery }}>{children}</Ctx.Provider>;
}
