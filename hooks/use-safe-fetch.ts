"use client";

import { useEffect, useState } from "react";

export type FetchState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string; canRetry: boolean }
  | { status: "db_waking"; message: string };

export type UseSafeFetchOptions = {
  autoRetry?: boolean;
  retryDelay?: number; // milliseconds
  maxRetries?: number;
};

/**
 * Client-side hook for safely fetching data with graceful Supabase wake-up handling
 * @param fetcher - Async function that fetches data from your API
 * @param options - Configuration for retry behavior
 */
export function useSafeFetch<T>(
  fetcher: () => Promise<Response>,
  options: UseSafeFetchOptions = {}
) {
  const { autoRetry = true, retryDelay = 3000, maxRetries = 3 } = options;

  const [state, setState] = useState<FetchState<T>>({ status: "loading" });
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = async () => {
    try {
      setState({ status: "loading" });

      const response = await fetcher();

      // Handle timeout (503 Service Unavailable)
      if (response.status === 503) {
        const json = await response.json();

        if (json.code === "timeout") {
          setState({
            status: "db_waking",
            message: json.error || "Database is waking up. Please wait...",
          });

          // Auto-retry if enabled and within retry limit
          if (autoRetry && retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
            }, retryDelay);
          }
          return;
        }
      }

      // Handle other errors
      if (!response.ok) {
        const json = await response.json();
        setState({
          status: "error",
          error: json.error || "An error occurred",
          canRetry: true,
        });
        return;
      }

      // Success
      const data = await response.json();
      setState({ status: "success", data });
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      setState({
        status: "error",
        error: err.message || "Network error",
        canRetry: true,
      });
    }
  };

  // Initial fetch and retry effect
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  const retry = () => {
    setRetryCount(0);
    fetchData();
  };

  return { state, retry };
}
