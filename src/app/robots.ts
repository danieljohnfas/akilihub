import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/api/docs',
        ],
        disallow: [
          // Internal API routes
          '/api/',
          // Admin panel
          '/admin',
          '/admin/',
          // Auth & account pages — no SEO value
          '/login',
          '/signup',
          '/forgot-password',
          '/auth/',
          '/account',
          '/account/',
          '/dashboard',
          '/dashboard/',
          // Next.js generated OG image routes — not real pages.
          // Use explicit per-section rules + a broad suffix catch-all.
          // Google supports * as "any sequence of characters" so these cover:
          //   /jobs/{uuid}/opengraph-image
          //   /jobs/{uuid}/opengraph-image?<cache-buster>
          //   /tenders/{uuid}/opengraph-image
          '/jobs/*/opengraph-image',
          '/jobs/*/opengraph-image?*',
          '/tenders/*/opengraph-image',
          '/tenders/*/opengraph-image?*',
          '/compliance/*/opengraph-image',
          '/compliance/*/opengraph-image?*',
          '/guides/*/opengraph-image',
          '/guides/*/opengraph-image?*',
          // Search/filter state URLs that duplicate listing pages
          '/jobs?*',
          '/tenders?*',
          '/salaries?*',
          '/health?*',
          '/compliance?*',
          '/guides?*',
        ],
      },
    ],
    sitemap: 'https://akilibrain.com/sitemap.xml',
  };
}
