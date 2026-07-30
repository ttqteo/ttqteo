"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";

type NavContext = {
  pending: boolean;
  pendingHref: string | null;
  navigate: (href: string, opts?: { replace?: boolean }) => void;
};

const Ctx = createContext<NavContext>({
  pending: false,
  pendingHref: null,
  navigate: () => {},
});

export const useAdminNav = () => useContext(Ctx);

/**
 * Filter navigation is a server round-trip, and React deliberately keeps the
 * old UI on screen during a transition rather than showing Suspense fallbacks —
 * which is why a keyed <Suspense> alone left the table looking idle. Tracking
 * the pending navigation here lets the table swap itself for a skeleton.
 */
export function AdminNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [href, setHref] = useState<string | null>(null);

  const navigate = useCallback<NavContext["navigate"]>(
    (target, opts) => {
      setHref(target);
      startTransition(() => {
        if (opts?.replace) router.replace(target);
        else router.push(target);
      });
    },
    [router],
  );

  useEffect(() => {
    if (!isPending) setHref(null);
  }, [isPending]);

  return (
    <Ctx.Provider
      value={{ pending: isPending, pendingHref: isPending ? href : null, navigate }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Renders `fallback` while a filter/sort navigation is in flight. */
export function PendingSwap({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { pending } = useAdminNav();
  return pending ? fallback : children;
}
