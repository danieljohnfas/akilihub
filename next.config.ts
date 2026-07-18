import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permanently redirect all non-canonical variants so Google knows
  // the one true URL is https://akilibrain.com (no www, no http)
  async redirects() {
    return [
      // http://akilibrain.com/* → https://akilibrain.com/*
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'akilibrain.com' }],
        destination: 'https://akilibrain.com/:path*',
        permanent: true,
        // Only fires when request is over plain http (Vercel handles https upgrade, but this covers edge cases)
      },
      // https://www.akilibrain.com/* → https://akilibrain.com/*
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
