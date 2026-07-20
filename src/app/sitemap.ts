import type { MetadataRoute } from 'next';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://akilibrain.com';

// Cache the sitemap on Vercel's edge for 1 hour to prevent DB overload.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Static & Filter Pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/tenders`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/jobs`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/compliance`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/health`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/salaries`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/developers`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/jobs?type=full_time`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE_URL}/jobs?type=remote`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE_URL}/jobs?type=internship`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE_URL}/jobs?location=Kenya`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE_URL}/jobs?location=Tanzania`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE_URL}/jobs?location=Uganda`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE_URL}/tenders?status=open`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE_URL}/tenders?status=awarded`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];

  // 2. Fetch all active entities, capped to ensure we never breach Next.js 50k limit in a single file
  const [tenderRows, jobRows, businessRows] = await Promise.all([
    safeQuery(db.select({ id: tenders.id, updatedAt: tenders.updatedAt }).from(tenders).limit(15000)),
    safeQuery(db.select({ id: jobs.id, updatedAt: jobs.updatedAt }).from(jobs).where(eq(jobs.isActive, true)).limit(20000)),
    safeQuery(db.select({ id: businesses.id, updatedAt: businesses.updatedAt }).from(businesses).where(eq(businesses.status, 'active')).limit(10000)),
  ]);

  const tenderPages: MetadataRoute.Sitemap = tenderRows.map((t) => ({
    url: `${BASE_URL}/tenders/${t.id}`,
    lastModified: t.updatedAt,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const jobPages: MetadataRoute.Sitemap = jobRows.map((j) => ({
    url: `${BASE_URL}/jobs/${j.id}`,
    lastModified: j.updatedAt,
    changeFrequency: 'hourly',
    priority: 0.8,
  }));

  const businessPages: MetadataRoute.Sitemap = businessRows.map((b) => ({
    url: `${BASE_URL}/compliance/${b.id}`,
    lastModified: b.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...tenderPages, ...jobPages, ...businessPages];
}
