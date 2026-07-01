import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "akilihub",
  project: "akilihub-web",
  // Only print source-map upload logs in CI
  silent: !process.env.CI,
  // Route browser requests through Next.js to avoid ad-blockers
  tunnelRoute: "/monitoring",
});
