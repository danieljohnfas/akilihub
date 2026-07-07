import { db } from '../db/client';
import { complianceRequirements } from '../db/schema/compliance';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';
import { fetchHtml, htmlToText, extractResourcesWithAI } from './compliance-base';

const TRA_URL = 'https://www.tra.go.tz/index.php/calculators';

export async function scrapeTRAResources(): Promise<number> {
  console.log(`Starting TRA Tanzania resources scrape...`);
  try {
    const html = await fetchHtml(TRA_URL);
    if (!html) {
      console.log('[TRA] Could not fetch HTML. Skipping.');
      return 0;
    }

    const text = htmlToText(html, TRA_URL);
    const resources = await extractResourcesWithAI(
      text,
      'Tanzania Revenue Authority (TRA)',
      TRA_URL,
      `Extract all tax tools, calculators, and compliance resources from the Tanzania Revenue Authority website.
Examples: PAYE Calculator, Motor Vehicle Valuation, VAT Calculator, Income Tax forms, etc.`,
    );

    if (resources.length === 0) return 0;

    const [tz] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);
    if (!tz) { console.warn('[TRA] Tanzania country not found.'); return 0; }

    const rows = resources.map(r => ({
      title: r.title,
      description: r.description,
      countryId: tz.id,
      category: 'tax' as const,
      issuingAuthority: 'Tanzania Revenue Authority (TRA)',
      resourceType: r.resourceType,
      sourceUrl: r.sourceUrl,
      isActive: true,
      lastVerifiedAt: new Date(),
    }));

    const inserted = await db.insert(complianceRequirements)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: complianceRequirements.id });

    console.log(`[TRA] Inserted ${inserted.length} resources.`);
    return inserted.length;
  } catch (error) {
    console.error('[TRA] Fatal error:', error);
    return 0;
  }
}
