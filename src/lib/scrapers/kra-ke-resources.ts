import { db } from '../db/client';
import { complianceRequirements } from '../db/schema/compliance';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';
import { fetchHtml, htmlToText, extractResourcesWithAI } from './compliance-base';

const KRA_URL = 'https://www.kra.go.ke/individual/filing-paying/types-of-taxes';
const KRA_DOWNLOADS_URL = 'https://www.kra.go.ke/individual/downloads';

export async function scrapeKRAResources(): Promise<number> {
  console.log(`Starting KRA Kenya resources scrape...`);
  try {
    // Try the downloads page first, fall back to types-of-taxes
    let html = await fetchHtml(KRA_DOWNLOADS_URL);
    let usedUrl = KRA_DOWNLOADS_URL;
    if (!html) {
      html = await fetchHtml(KRA_URL);
      usedUrl = KRA_URL;
    }
    if (!html) {
      console.log('[KRA] Could not fetch HTML from any URL. Skipping.');
      return 0;
    }

    const text = htmlToText(html, usedUrl);
    const resources = await extractResourcesWithAI(
      text,
      'Kenya Revenue Authority (KRA)',
      usedUrl,
      `Extract all downloadable forms, calculators, and compliance guides from the Kenya Revenue Authority website.
Examples: iTax forms, VAT returns, PAYE guides, income tax forms, customs forms, etc.`,
    );

    if (resources.length === 0) return 0;

    const [ke] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'KE')).limit(1);
    if (!ke) { console.warn('[KRA] Kenya country not found.'); return 0; }

    const rows = resources.map(r => ({
      title: r.title,
      description: r.description,
      countryId: ke.id,
      category: 'tax' as const,
      issuingAuthority: 'Kenya Revenue Authority (KRA)',
      resourceType: r.resourceType,
      sourceUrl: r.sourceUrl,
      isActive: true,
      lastVerifiedAt: new Date(),
    }));

    const inserted = await db.insert(complianceRequirements)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: complianceRequirements.id });

    console.log(`[KRA] Inserted ${inserted.length} resources.`);
    return inserted.length;
  } catch (error) {
    console.error('[KRA] Fatal error:', error);
    return 0;
  }
}
