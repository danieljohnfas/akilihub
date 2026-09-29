import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook. The root sentry.*.config.ts files were never loaded before
 * (they are only picked up by `withSentryConfig`, which this project does not use), so Sentry
 * was silently inert. Registering them here is the supported way for Next 15/16 + @sentry/nextjs 10.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
