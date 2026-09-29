import type { NextConfig } from "next";

/**
 * Deployment targets:
 *  - Docker / Linode (production): the Dockerfile sets NEXT_OUTPUT=standalone so `next build`
 *    emits `.next/standalone` (the Dockerfile copies it). This flag was accidentally removed
 *    before, which made every Docker build fail at the COPY step.
 *  - Vercel: leave NEXT_OUTPUT unset (Vercel ignores/handles output itself).
 */
const useStandalone = process.env.NEXT_OUTPUT === "standalone";

/**
 * Content-Security-Policy.
 *
 * Shipped as *Report-Only* by default: violations are POSTed to /api/csp-report (logged) but nothing
 * is blocked, so AdSense / Clarity / PostHog / Google sign-in / Supabase cannot break while the policy
 * is tuned. Once the reports are clean set CSP_ENFORCE=1 to start enforcing.
 *
 * 'unsafe-inline' is required for now: Next.js App Router emits inline hydration scripts, and the
 * analytics/ad snippets are inline too. Moving to per-request nonces is the follow-up that lets it go.
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.googletagservices.com https://*.doubleclick.net https://adservice.google.com https://www.clarity.ms https://*.clarity.ms https://*.posthog.com https://accounts.google.com https://apis.google.com https://*.sentry.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.clarity.ms https://*.sentry.io https://*.ingest.sentry.io https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com",
  "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "report-uri /api/csp-report",
];
const cspHeaderName =
  process.env.CSP_ENFORCE === "1" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

const securityHeaders = [
  // The site is HTTPS-only (Cloudflare "Always Use HTTPS").
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: cspHeaderName, value: cspDirectives.join("; ") },
  // Disable nginx response buffering so Server Components stream properly.
  // Required when nginx sits in front of Next.js (Cloudflare → nginx → Next.js).
  { key: "X-Accel-Buffering", value: "no" },
];

const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  poweredByHeader: false,

  // Type errors used to be ignored unconditionally, which is how 40+ of them (including a
  // broken pdf-parse import) shipped. CI now runs `npm run typecheck` and the default build
  // validates types too. Only the low-RAM Docker build skips the (memory-hungry) TS worker,
  // relying on the CI typecheck.
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1" },

  serverExternalPackages: ["postgres", "drizzle-orm", "pdf-parse", "undici"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "@iconify/react"],
  },

  // Permanently redirect all non-canonical variants so Google knows
  // the one true URL is https://akilibrain.com (no www, no http)
  async redirects() {
    return [
      // NOTE: HTTPS enforcement is handled by Cloudflare "Always Use HTTPS".
      // Do NOT add an x-forwarded-proto redirect here — Cloudflare terminates
      // TLS and sends HTTP to the origin, so that rule would loop infinitely.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.akilibrain.com" }],
        destination: "https://akilibrain.com/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...[
        "/api/:path*",
        "/admin/:path*",
        "/dashboard/:path*",
        "/login",
        "/signup",
        "/forgot-password",
        "/account",
        "/account/:path*",
        "/auth/:path*",
        "/unsubscribe",
        "/subscribe/:path*",
        "/jobs/:id/apply",
        "/tenders/:id/apply",
      ].map((source) => ({ source, headers: [noindex] })),
    ];
  },
};

export default nextConfig;
