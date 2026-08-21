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
