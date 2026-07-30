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
 */
export function AdminProvider({ children }: PropsWithChildren) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!hasAuthCookie()) return;

    let cancelled = false;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setAdmin(!!data?.isAdmin);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Drives the admin-only layout offsets in globals.css.
    document.documentElement.classList.toggle("is-admin", admin);
  }, [admin]);

  return <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>;
}
