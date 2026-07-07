import { db } from '../db/client';
import { complianceRequirements } from '../db/schema/compliance';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';
import { fetchHtml, htmlToText, extractResourcesWithAI } from './compliance-base';

const BRELA_URL = 'https://www.brela.go.tz/index.php/companies/forms';

export async function scrapeBRELAResources(): Promise<number> {
  console.log(`Starting BRELA Tanzania resources scrape...`);
  try {
    const html = await fetchHtml(BRELA_URL);
    if (!html) {
      console.log('[BRELA] Could not fetch HTML. Skipping.');
      return 0;
    }

    const text = htmlToText(html, BRELA_URL);
    const resources = await extractResourcesWithAI(
      text,
      'Business Registrations and Licensing Agency (BRELA)',
      BRELA_URL,
      `Extract all downloadable forms and compliance documents from the BRELA (Business Registrations and Licensing Agency) website.
Examples: Form 14a (Memorandum & Articles), Form 14b, Beneficial Ownership Declaration forms, fee schedules, company registration forms, etc.`,
    );

    if (resources.length === 0) return 0;

    const [tz] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);
    if (!tz) { console.warn('[BRELA] Tanzania country not found.'); return 0; }

    const rows = resources.map(r => ({
      title: r.title,
      description: r.description,
      countryId: tz.id,
      category: 'business_registration' as const,
      issuingAuthority: 'Business Registrations and Licensing Agency (BRELA)',
      resourceType: r.resourceType,
      sourceUrl: r.sourceUrl,
      isActive: true,
      lastVerifiedAt: new Date(),
    }));

    const inserted = await db.insert(complianceRequirements)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: complianceRequirements.id });

    console.log(`[BRELA] Inserted ${inserted.length} resources.`);
    return inserted.length;
  } catch (error) {
    console.error('[BRELA] Fatal error:', error);
    return 0;
  }
}
