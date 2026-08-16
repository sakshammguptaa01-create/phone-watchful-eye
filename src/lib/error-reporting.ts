type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

/**
 * Generic client-side error reporter.
 *
 * In development this logs to the console. In a production deployment you could
 * wire it to Sentry, LogRocket, or another monitoring service by setting
 * window.__errorReporter.captureException on app startup.
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  _options: ErrorReportOptions = {},
) {
  if (typeof window === "undefined") return;

  // Default behavior: log to console so errors are not silently swallowed.
  console.error("Application error:", error, context);

  // Extension hook for a real monitoring service.
  const reporter = (window as typeof window & { __errorReporter?: { captureException?: (error: unknown, context?: Record<string, unknown>) => void } }).__errorReporter;
  reporter?.captureException?.(error, context);
}
