import { NextResponse } from 'next/server';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { guides } from '@/lib/db/schema/guides';
import { countries } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://akilibrain.com';

export const revalidate = 3600;

const COUNTRY_SLUGS: Record<string, string> = {
  Kenya: 'kenya', Tanzania: 'tanzania', Uganda: 'uganda', Rwanda: 'rwanda',
  Ethiopia: 'ethiopia', Somalia: 'somalia', 'South Sudan': 'south-sudan',
  'Democratic Republic of the Congo': 'democratic-republic-of-the-congo', Burundi: 'burundi',
};

function buildUrlSet(urls: { url: string; lastModified?: Date; changeFrequency?: string; priority?: number }[]) {
  const xmlUrls = urls.map((u) => {
    return `<url>
  <loc>\${u.url}</loc>
  \${u.lastModified ? \`<lastmod>\${u.lastModified.toISOString()}</lastmod>\` : ''}
  \${u.changeFrequency ? \`<changefreq>\${u.changeFrequency}</changefreq>\` : ''}
  \${u.priority ? \`<priority>\${u.priority}</priority>\` : ''}
</url>`;
  }).join('\\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\${xmlUrls}
</urlset>`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr.replace('.xml', ''), 10);
  const now = new Date();

  if (id === 0) {
    const staticPages = [
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

    const tenderPages = tenderRows.map((t) => ({
      url: \`\${BASE_URL}/tenders/\${t.id}\`, lastModified: t.updatedAt || now, changeFrequency: 'daily', priority: 0.7
    }));

    const guidePages = guideRows.map((g) => ({
      url: \`\${BASE_URL}/guides/\${g.slug}\`, lastModified: g.updatedAt || now, changeFrequency: 'monthly', priority: 0.9
    }));

    const countryPages = countryRows.map((c) => ({
      url: \`\${BASE_URL}/countries/\${COUNTRY_SLUGS[c.name] ?? c.name.toLowerCase().replace(/\\s+/g, '-')}\`,
      lastModified: c.updatedAt || now, changeFrequency: 'daily', priority: 0.85
    }));

    const xml = buildUrlSet([...staticPages, ...tenderPages, ...guidePages, ...countryPages]);
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
  }

  if (id === 1 || id === 2) {
    const offset = id === 1 ? 0 : 25000;
    const jobRows = await safeQuery(db.select({ id: jobs.id, updatedAt: jobs.updatedAt }).from(jobs).where(eq(jobs.isActive, true)).limit(25000).offset(offset));
    
    const pages = jobRows.map((j) => ({
      url: \`\${BASE_URL}/jobs/\${j.id}\`, lastModified: j.updatedAt || now, changeFrequency: 'hourly', priority: 0.8
    }));
    return new NextResponse(buildUrlSet(pages), { headers: { 'Content-Type': 'application/xml' } });
  }

  if (id === 3 || id === 4) {
    const offset = id === 3 ? 0 : 25000;
    const businessRows = await safeQuery(db.select({ id: businesses.id, updatedAt: businesses.updatedAt }).from(businesses).where(eq(businesses.status, 'active')).limit(25000).offset(offset));
    
    const pages = businessRows.map((b) => ({
      url: \`\${BASE_URL}/compliance/\${b.id}\`, lastModified: b.updatedAt || now, changeFrequency: 'weekly', priority: 0.6
    }));
    return new NextResponse(buildUrlSet(pages), { headers: { 'Content-Type': 'application/xml' } });
  }

  return new NextResponse('Not found', { status: 404 });
}
