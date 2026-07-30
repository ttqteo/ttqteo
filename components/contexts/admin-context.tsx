"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

const AdminContext = createContext(false);

export function useIsAdmin() {
  return useContext(AdminContext);
}

/** Supabase stores its session in cookies named `sb-<project-ref>-auth-token`. */
function hasAuthCookie() {
  return /(^|;\s*)sb-[^=]*-auth-token(\.\d+)?=/.test(document.cookie);
}

/**
 * Resolves "is the owner viewing this?" on the client.
 *
 * The admin chrome used to be server-rendered via `isAdmin()`, which reads
 * `cookies()` in the root layout — that opted every route out of static
 * rendering, so each navigation waited on a fresh server render plus a Supabase
 * auth round-trip. Deciding it client-side keeps the whole shell static and
 * prefetchable; visitors without a session never even make the request.
 *
 * The inline script in the document head optimistically sets `is-admin` on
 * <html> when an auth cookie exists, so the admin offsets apply before first
 * paint. `admin` therefore starts as `null` (unresolved) and we only touch the
 * class once the API has answered — otherwise we would strip the optimistic
 * class and reintroduce the layout jump this is meant to avoid.
 */
export function AdminProvider({ children }: PropsWithChildren) {
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hasAuthCookie()) {
      setAdmin(false);
      return;
    }

    let cancelled = false;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setAdmin(!!data?.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (admin === null) return;
    document.documentElement.classList.toggle("is-admin", admin);
  }, [admin]);

  return (
    <AdminContext.Provider value={admin === true}>
      {children}
    </AdminContext.Provider>
  );
}
