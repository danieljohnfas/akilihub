import { NextResponse } from 'next/server';

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://akilibrain.com/sitemap/0.xml</loc></sitemap>
  <sitemap><loc>https://akilibrain.com/sitemap/1.xml</loc></sitemap>
  <sitemap><loc>https://akilibrain.com/sitemap/2.xml</loc></sitemap>
  <sitemap><loc>https://akilibrain.com/sitemap/3.xml</loc></sitemap>
  <sitemap><loc>https://akilibrain.com/sitemap/4.xml</loc></sitemap>
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
