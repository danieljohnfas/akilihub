import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "akilihub",
  project: "akilihub-web",
  silent: !process.env.CI,
  sourcemaps: {
    widenClientFileUpload: true,
    hideSourceMaps: true,
  },
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
