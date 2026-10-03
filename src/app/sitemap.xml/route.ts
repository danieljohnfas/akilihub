import { NextResponse } from 'next/server';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { businesses } from '@/lib/db/schema/compliance';
import { eq, and, or, isNull, gt, count } from 'drizzle-orm';

export const revalidate = 3600;

export async function GET() {
  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );
  
  const [jobsCountRes, bizCountRes] = await Promise.all([
    safeQuery(db.select({ value: count() }).from(jobs).where(activeCondition)),
    safeQuery(db.select({ value: count() }).from(businesses).where(eq(businesses.status, 'active')))
  ]);

  const jobsCount = jobsCountRes?.[0]?.value || 0;
  const bizCount = bizCountRes?.[0]?.value || 0;

  const PAGE_SIZE = 10000;
  const jobSitemapsCount = Math.ceil(jobsCount / PAGE_SIZE) || 1;
  const bizSitemapsCount = Math.ceil(bizCount / PAGE_SIZE) || 1;

  const sitemaps = ['<sitemap><loc>https://akilibrain.com/sitemaps/static.xml</loc></sitemap>'];
  
  for (let i = 0; i < jobSitemapsCount; i++) {
    sitemaps.push(`<sitemap><loc>https://akilibrain.com/sitemaps/jobs-${i}.xml</loc></sitemap>`);
  }
  
  for (let i = 0; i < bizSitemapsCount; i++) {
    sitemaps.push(`<sitemap><loc>https://akilibrain.com/sitemaps/businesses-${i}.xml</loc></sitemap>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.join('\n  ')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
