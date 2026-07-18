import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permanently redirect all non-canonical variants so Google knows
  // the one true URL is https://akilibrain.com (no www, no http)
  async redirects() {
    return [
      // www.akilibrain.com/* → akilibrain.com/*
      // NOTE: Do NOT add a redirect for akilibrain.com → https://akilibrain.com
      // Vercel handles https upgrades automatically. Adding it here causes
      // ERR_TOO_MANY_REDIRECTS because the rule matches the canonical domain itself.
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
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Tell Google the canonical domain
          { key: 'X-Robots-Tag', value: 'index, follow' },
        ],
      },
    ];
  },
};

export default nextConfig;
