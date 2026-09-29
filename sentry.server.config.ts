import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Only initialise when a DSN is configured.
  enabled: Boolean(dsn),
  // 100% tracing (the old value) is expensive; sample instead.
  tracesSampleRate: 0.1,
  // Never attach IPs / cookies / request bodies automatically.
  sendDefaultPii: false,
  debug: false,
});
