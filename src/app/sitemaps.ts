import type { MetadataRoute } from 'next';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { guides } from '@/lib/db/schema/guides';
import { countries } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://akilibrain.com';

export const revalidate = 3600; // Cache for 1 hour

const COUNTRY_SLUGS: Record<string, string> = {
  Kenya: 'kenya',
  Tanzania: 'tanzania',
  Uganda: 'uganda',
  Rwanda: 'rwanda',
  Ethiopia: 'ethiopia',
  Somalia: 'somalia',
  'South Sudan': 'south-sudan',
  'Democratic Republic of the Congo': 'democratic-republic-of-the-congo',
  Burundi: 'burundi',
};

// Generate multiple sitemaps to bypass the 50,000 URL limit per file
export async function generateSitemaps() {
  return [
    { id: 0 }, // General, Tenders, Guides, Countries
    { id: 1 }, // Jobs part 1
    { id: 2 }, // Jobs part 2
    { id: 3 }, // Businesses part 1
    { id: 4 }, // Businesses part 2
  ];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  
  if (id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
      { url: \`\${BASE_URL}/tenders\`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
      { url: \`\${BASE_URL}/jobs\`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
      { url: \`\${BASE_URL}/compliance\`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
      { url: \`\${BASE_URL}/health\`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: \`\${BASE_URL}/salaries\`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: \`\${BASE_URL}/guides\`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: \`\${BASE_URL}/countries\`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
      { url: \`\${BASE_URL}/developers\`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
      { url: \`\${BASE_URL}/about\`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
      { url: \`\${BASE_URL}/contact\`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
      { url: \`\${BASE_URL}/privacy\`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
      { url: \`\${BASE_URL}/terms\`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    ];

    const [tenderRows, guideRows, countryRows] = await Promise.all([
      safeQuery(db.select({ id: tenders.id, updatedAt: tenders.updatedAt }).from(tenders).limit(20000)),
      safeQuery(db.select({ slug: guides.slug, updatedAt: guides.updatedAt }).from(guides).where(eq(guides.isPublished, true)).limit(5000)),
      safeQuery(db.select({ name: countries.name, updatedAt: countries.updatedAt }).from(countries)),
    ]);

    const tenderPages: MetadataRoute.Sitemap = tenderRows.map((t) => ({
      url: \`\${BASE_URL}/tenders/\${t.id}\`,
      lastModified: t.updatedAt,
      changeFrequency: 'daily',
      priority: 0.7,
    }));

    const guidePages: MetadataRoute.Sitemap = guideRows.map((g) => ({
      url: \`\${BASE_URL}/guides/\${g.slug}\`,
      lastModified: g.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.9,
    }));

    const countryPages: MetadataRoute.Sitemap = countryRows.map((c) => {
      const slug = COUNTRY_SLUGS[c.name] ?? c.name.toLowerCase().replace(/\\s+/g, '-');
      return {
        url: \`\${BASE_URL}/countries/\${slug}\`,
        lastModified: c.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.85,
      };
    });

    return [...staticPages, ...tenderPages, ...guidePages, ...countryPages];
  }

  if (id === 1 || id === 2) {
    const offset = id === 1 ? 0 : 25000;
    const jobRows = await safeQuery(db.select({ id: jobs.id, updatedAt: jobs.updatedAt }).from(jobs).where(eq(jobs.isActive, true)).limit(25000).offset(offset));
    
    return jobRows.map((j) => ({
      url: \`\${BASE_URL}/jobs/\${j.id}\`,
      lastModified: j.updatedAt,
      changeFrequency: 'hourly',
      priority: 0.8,
    }));
  }

  if (id === 3 || id === 4) {
    const offset = id === 3 ? 0 : 25000;
    const businessRows = await safeQuery(db.select({ id: businesses.id, updatedAt: businesses.updatedAt }).from(businesses).where(eq(businesses.status, 'active')).limit(25000).offset(offset));
    
    return businessRows.map((b) => ({
      url: \`\${BASE_URL}/compliance/\${b.id}\`,
      lastModified: b.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  }

  return [];
}
