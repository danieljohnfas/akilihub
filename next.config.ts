import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment: emits a minimal standalone server
  // in .next/standalone that includes only the files needed to run.
  output: 'standalone',

  // Skip type-checking during `next build` on the production server.
  // Running it at deploy time OOMs on 1GB RAM because the TS worker spawns a second large Node.js process.
  typescript: { ignoreBuildErrors: true },

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', '@iconify/react'],
    serverExternalPackages: ['postgres'],
  },
  // Permanently redirect all non-canonical variants so Google knows
  // the one true URL is https://akilibrain.com (no www, no http)
  async redirects() {
    return [
      // www.akilibrain.com/* → akilibrain.com/*
      // NOTE: HTTPS enforcement is handled by Cloudflare "Always Use HTTPS".
      // Do NOT add an x-forwarded-proto redirect here — Cloudflare terminates
      // TLS and sends HTTP to the origin, so that rule would loop infinitely.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.akilibrain.com' }],
        destination: 'https://akilibrain.com/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/dashboard/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/login',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/signup',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/forgot-password',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/account',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/account/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/auth/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/jobs/:id/apply',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/tenders/:id/apply',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // Disable nginx response buffering so Server Components stream properly.
      // Required when nginx sits in front of Next.js (Cloudflare → nginx → Next.js).
      {
        source: '/:path*',
        headers: [
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
    ];
  },
};

export default nextConfig;
