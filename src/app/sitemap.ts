import type { MetadataRoute } from 'next';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { eq, sql } from 'drizzle-orm';

const BASE_URL = 'https://akilibrain.com';

/**
 * Paginated sitemap using generateSitemaps.
 * Google allows max 50,000 URLs per sitemap XML.
 * We chunk dynamic routes into pages of PAGE_SIZE each.
 *
 * Sitemaps will be served at:
 *   /sitemap/0.xml  → static pages + first chunk of dynamic routes
 *   /sitemap/1.xml  → tenders chunk 1
 *   /sitemap/2.xml  → tenders chunk 2
 *   /sitemap/3.xml  → jobs chunk 1
 *   ... etc.
 *
 * If the DB is small (current state), a single sitemap is returned.
 */

const PAGE_SIZE = 5000;

// ID slots:
// 0 = static pages
// 1–9 = tender pages (up to 45,000 tenders)
// 10–19 = job pages (up to 50,000 jobs)
// 20–29 = business pages (up to 50,000 businesses)

export async function generateSitemaps() {
  const [tenderCount, jobCount, businessCount] = await Promise.all([
    safeQuery(db.select({ count: sql<number>`count(*)` }).from(tenders)),
    safeQuery(db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.isActive, true))),
    safeQuery(db.select({ count: sql<number>`count(*)` }).from(businesses).where(eq(businesses.status, 'active'))),
  ]);

  const tenderPages = Math.max(1, Math.ceil(Number(tenderCount[0]?.count ?? 0) / PAGE_SIZE));
  const jobPages = Math.max(1, Math.ceil(Number(jobCount[0]?.count ?? 0) / PAGE_SIZE));
  const businessPages = Math.max(1, Math.ceil(Number(businessCount[0]?.count ?? 0) / PAGE_SIZE));

  const ids = [
    { id: 0 }, // static
    ...Array.from({ length: tenderPages }, (_, i) => ({ id: i + 1 })),
    ...Array.from({ length: jobPages }, (_, i) => ({ id: i + 10 })),
    ...Array.from({ length: businessPages }, (_, i) => ({ id: i + 20 })),
  ];

  return ids;
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ─── Static pages (id = 0) ─────────────────────────────────────────────────
  if (id === 0) {
    return [
      { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
      { url: `${BASE_URL}/tenders`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${BASE_URL}/jobs`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${BASE_URL}/compliance`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
      { url: `${BASE_URL}/health`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${BASE_URL}/salaries`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${BASE_URL}/developers`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
      // SEO-optimised filter pages (these are crawlable HTML links from the listing pages)
      { url: `${BASE_URL}/jobs?type=full_time`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
      { url: `${BASE_URL}/jobs?type=remote`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
      { url: `${BASE_URL}/jobs?type=internship`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
      { url: `${BASE_URL}/jobs?location=Kenya`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
      { url: `${BASE_URL}/jobs?location=Tanzania`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
      { url: `${BASE_URL}/jobs?location=Uganda`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
      { url: `${BASE_URL}/tenders?status=open`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
      { url: `${BASE_URL}/tenders?status=awarded`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    ];
  }

  // ─── Tenders (ids 1-9) ─────────────────────────────────────────────────────
  if (id >= 1 && id <= 9) {
    const page = id - 1;
    const rows = await safeQuery(
      db
        .select({ id: tenders.id, updatedAt: tenders.updatedAt })
        .from(tenders)
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE)
    );
    return rows.map((t) => ({
      url: `${BASE_URL}/tenders/${t.id}`,
      lastModified: t.updatedAt,
      changeFrequency: 'daily',
      priority: 0.7,
    }));
  }

  // ─── Jobs (ids 10-19) ──────────────────────────────────────────────────────
  if (id >= 10 && id <= 19) {
    const page = id - 10;
    const rows = await safeQuery(
      db
        .select({ id: jobs.id, updatedAt: jobs.updatedAt })
        .from(jobs)
        .where(eq(jobs.isActive, true))
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE)
    );
    return rows.map((j) => ({
      url: `${BASE_URL}/jobs/${j.id}`,
      lastModified: j.updatedAt,
      changeFrequency: 'daily',
      priority: 0.7,
    }));
  }

  // ─── Businesses (ids 20-29) ────────────────────────────────────────────────
  if (id >= 20 && id <= 29) {
    const page = id - 20;
    const rows = await safeQuery(
      db
        .select({ id: businesses.id, updatedAt: businesses.updatedAt })
        .from(businesses)
        .where(eq(businesses.status, 'active'))
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE)
    );
    return rows.map((b) => ({
      url: `${BASE_URL}/compliance/${b.id}`,
      lastModified: b.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  }

  return [];
}
