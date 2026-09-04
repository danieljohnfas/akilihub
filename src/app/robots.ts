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
          // Auth and Account pages
          '/login',
          '/signup',
          '/forgot-password',
          '/account',
          // Outbound redirect tracker
          '/api/out',
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
    sitemap: [
      'https://akilibrain.com/sitemap/0.xml',
      'https://akilibrain.com/sitemap/1.xml',
      'https://akilibrain.com/sitemap/2.xml',
      'https://akilibrain.com/sitemap/3.xml',
      'https://akilibrain.com/sitemap/4.xml',
    ],
  };
}
