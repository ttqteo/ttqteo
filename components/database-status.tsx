"use client";

import { AlertCircle, Loader2, RefreshCw, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type DatabaseStatusProps = {
  status: "loading" | "db_waking" | "error";
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
};

export function DatabaseStatus({
  status,
  message,
  onRetry,
  showRetryButton = true,
}: DatabaseStatusProps) {
  if (status === "loading") {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          Loading...
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Fetching data from the database.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "db_waking") {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
        <Zap className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900 dark:text-yellow-100">
          Database is waking up
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          {message || "The database is starting up. This may take a few seconds..."}
          {showRetryButton && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh now
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "error") {
    return (
      <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-900 dark:text-red-100">
          Error
        </AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          {message || "Something went wrong. Please try again."}
          {showRetryButton && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
