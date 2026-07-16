import type { MetadataRoute } from 'next';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://akilibrain.com';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // re-generate at most once per hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ─── Static pages ─────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/tenders`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/jobs`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/compliance`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/health`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/salaries`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/developers`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // ─── Dynamic: Tenders ─────────────────────────────────────────────────────
  const tenderRows = await safeQuery(
    db
      .select({ id: tenders.id, updatedAt: tenders.updatedAt })
      .from(tenders)
  );

  const tenderRoutes: MetadataRoute.Sitemap = tenderRows.map((t) => ({
    url: `${BASE_URL}/tenders/${t.id}`,
    lastModified: t.updatedAt,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // ─── Dynamic: Jobs ────────────────────────────────────────────────────────
  const jobRows = await safeQuery(
    db
      .select({ id: jobs.id, updatedAt: jobs.updatedAt })
      .from(jobs)
      .where(
        eq(jobs.isActive, true)
      )
  );

  const jobRoutes: MetadataRoute.Sitemap = jobRows.map((j) => ({
    url: `${BASE_URL}/jobs/${j.id}`,
    lastModified: j.updatedAt,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // ─── Dynamic: Businesses ──────────────────────────────────────────────────
  const businessRows = await safeQuery(
    db
      .select({ id: businesses.id, updatedAt: businesses.updatedAt })
      .from(businesses)
      .where(eq(businesses.status, 'active'))
  );

  const businessRoutes: MetadataRoute.Sitemap = businessRows.map((b) => ({
    url: `${BASE_URL}/compliance/${b.id}`,
    lastModified: b.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...tenderRoutes,
    ...jobRoutes,
    ...businessRoutes,
  ];
}

