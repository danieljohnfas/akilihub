import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
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
          // Next.js generated OG image routes — not real pages
          '/*/opengraph-image',
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
