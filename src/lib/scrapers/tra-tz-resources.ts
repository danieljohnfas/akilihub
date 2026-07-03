import { StrategyEngine } from '../strategies/engine';
import {
  FirecrawlStrategy,
  MaxunStrategy,
  Crawl4AiStrategy,
  CrawleeStrategy,
} from '../strategies/scraper-strategies';
import { db } from '../db/client';
import { complianceRequirements, complianceResourceTypeEnum } from '../db/schema/compliance';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const TRA_RESOURCES_URL = 'https://www.tra.go.tz/index.php/calculators'; // Base URL for the scrape

export async function scrapeTRAResources(): Promise<number> {
  const scraperEngine = new StrategyEngine([
    new FirecrawlStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy(),
    new MaxunStrategy(),
  ]);

  try {
    console.log(`Starting TRA Tanzania resources scrape...`);
    
    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: TRA_RESOURCES_URL,
      portalType: 'tra_tz_resources'
    });
    
    console.log(`Successfully scraped TRA using ${strategyUsed}.`);
    
    if (!result) return 0;

    const extractPrompt = `
      Extract a list of compliance resources (calculators, forms, guidelines, notices) from the following markdown scraped from the Tanzania Revenue Authority (TRA) website.
      Only extract official resources (e.g. PAYE Calculator, Motor Vehicle Valuation, Tax Forms).

      Markdown:
      ${typeof result === 'string' ? result : JSON.stringify(result).substring(0, 10000)}
    `;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        resources: z.array(z.object({
          title: z.string(),
          description: z.string(),
          resourceType: z.enum(['form', 'calculator', 'guideline', 'notice']),
          sourceUrl: z.string(),
        }))
      }),
      prompt: extractPrompt,
    });

    if (object.resources.length === 0) return 0;

    const [tz] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);
    if (!tz) return 0;

    const formattedResources = object.resources.map(r => ({
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

    // Insert but conflict on title+countryId if there's a unique constraint, otherwise just insert
    const inserted = await db.insert(complianceRequirements)
      .values(formattedResources)
      .returning({ id: complianceRequirements.id });

    console.log(`Successfully inserted ${inserted.length} TRA resources.`);
    return inserted.length;
  } catch (error) {
    console.error('Failed to scrape TRA resources:', error);
    return 0;
  }
}
