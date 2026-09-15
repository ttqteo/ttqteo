"use client";

import { AdminFetchError, adminFetch } from "@/lib/admin-fetch";
import { monthRange, type CalendarPayload } from "@/lib/calendar-events";
import { useCallback, useMemo, useRef, useState } from "react";
import { clearAdminSession, reportAdminError } from "./report-admin-error";

export type CalendarMonth = {
  status: "loading" | "ready" | "error";
  /** Kept while a reload runs, so the agenda does not blank out. */
  payload: CalendarPayload | null;
};

export type CalendarStore = {
  /** By month, "YYYY-MM". */
  months: Record<string, CalendarMonth>;
  /** Loads the month unless it was loaded in the last five minutes. */
  ensure: (month: string) => void;
  /** Loads the month again, past the server's cache as well. */
  refresh: (month: string) => void;
};

const STALE_MS = 5 * 60_000;

/**
 * Google Calendar events by month, kept while the admin layout stays mounted.
 *
 * `enabled`: gated on the admin check. The head script can restore the
 * Calendar panel from localStorage before that is known, for a signed-out
 * visitor or a non-admin account on the same browser; `ensure` and `refresh`
 * do nothing until then, so the panel never fires a request, or a "sign in
 * again" toast, on the login screen.
 */
export function useCalendarStore(enabled: boolean): CalendarStore {
  const [months, setMonths] = useState<Record<string, CalendarMonth>>({});
  const loadedAt = useRef(new Map<string, number>());
  const inflight = useRef(new Set<string>());

  const load = useCallback(async (month: string, fresh: boolean) => {
    if (inflight.current.has(month)) return;
    inflight.current.add(month);
    setMonths((all) => ({
      ...all,
      [month]: { status: "loading", payload: all[month]?.payload ?? null },
    }));

    const { from, to } = monthRange(month);
    try {
      const payload = await adminFetch<CalendarPayload>(
        `/api/admin/calendar?from=${from}&to=${to}${fresh ? "&fresh=1" : ""}`,
      );
      clearAdminSession();
      loadedAt.current.set(month, Date.now());
      setMonths((all) => ({ ...all, [month]: { status: "ready", payload } }));
    } catch (error) {
      setMonths((all) => ({
        ...all,
        [month]: { status: "error", payload: all[month]?.payload ?? null },
      }));
      // Anything else is shown in the panel; a lapsed session needs the way back in.
      if (error instanceof AdminFetchError && error.kind === "auth") {
        reportAdminError(error, "Tải lịch");
      }
    } finally {
      inflight.current.delete(month);
    }
  }, []);

  const ensure = useCallback(
    (month: string) => {
      if (!enabled) return;
      const at = loadedAt.current.get(month);
      if (at !== undefined && Date.now() - at < STALE_MS) return;
      void load(month, false);
    },
    [enabled, load],
  );

  const refresh = useCallback(
    (month: string) => {
      if (!enabled) return;
      void load(month, true);
    },
    [enabled, load],
  );

  return useMemo(() => ({ months, ensure, refresh }), [months, ensure, refresh]);
}
