"use client";

import { DatabaseStatus } from "@/components/database-status";
import { useSafeFetch } from "@/hooks/use-safe-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TestResult = {
  success: boolean;
  duration_ms: number;
  message: string;
  data_count?: number;
  error?: string;
  code?: string;
};

/**
 * Test page to verify Supabase wake-up handling
 *
 * Visit /test-wake-up to see the solution in action
 *
 * What to expect:
 * 1. If DB is awake: Instant success (~100-500ms)
 * 2. If DB is paused:
 *    - First attempt: Times out at 8s → Shows "Database waking up"
 *    - Auto-retry after 4s
 *    - Second attempt: Success! (~100-500ms)
 */
export default function TestWakeUpPage() {
  const { state, retry } = useSafeFetch<TestResult>(
    () => fetch("/api/test-wake-up"),
    {
      autoRetry: true,
      retryDelay: 4000,
      maxRetries: 3,
    }
  );

  return (
    <div className="container mx-auto max-w-2xl py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Supabase Wake-Up Test</CardTitle>
          <CardDescription>
            This page tests the Supabase timeout handling solution.
            <br />
            When the database is paused, you&apos;ll see graceful error handling instead of 504 errors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          {state.status === "loading" && (
            <DatabaseStatus status="loading" />
          )}

          {state.status === "db_waking" && (
            <DatabaseStatus
              status="db_waking"
              message={state.message}
              onRetry={retry}
            />
          )}

          {state.status === "error" && (
            <DatabaseStatus
              status="error"
              message={state.error}
              onRetry={retry}
            />
          )}

          {/* Success Result */}
          {state.status === "success" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">Success</Badge>
                <span className="text-sm text-muted-foreground">
                  Response time: {state.data.duration_ms}ms
                </span>
              </div>

              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Result:</p>
                <pre className="text-xs">
                  {JSON.stringify(state.data, null, 2)}
                </pre>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">What happened:</p>
                <ul className="list-disc list-inside space-y-1">
                  {state.data.duration_ms < 1000 ? (
                    <li>✅ Database was already awake (fast response)</li>
                  ) : (
                    <li>⚡ Database woke up during this request</li>
                  )}
                  <li>No 504 timeout errors occurred</li>
                  <li>Graceful error handling worked as expected</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">If database is awake:</span>
            <p>Response comes back in 100-500ms. You see success immediately.</p>
          </div>
          <div>
            <span className="font-medium text-foreground">If database is paused:</span>
            <ol className="list-decimal list-inside ml-2 space-y-1 mt-1">
              <li>First request times out after 8s → Returns 503</li>
              <li>Shows &quot;Database waking up&quot; message</li>
              <li>Auto-retries after 4 seconds</li>
              <li>Database is now awake → Success!</li>
            </ol>
          </div>
          <div className="pt-2 border-t">
            <span className="font-medium text-foreground">Result:</span>
            <p>No more 504 errors. Clean user experience with clear feedback.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
