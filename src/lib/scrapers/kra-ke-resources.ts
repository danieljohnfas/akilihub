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

const KRA_RESOURCES_URL = 'https://www.kra.go.ke/individual/downloads'; 

export async function scrapeKRAResources(): Promise<number> {
  const scraperEngine = new StrategyEngine([
    new FirecrawlStrategy(),
    new Crawl4AiStrategy(),
    new CrawleeStrategy(),
    new MaxunStrategy(),
  ]);

  try {
    console.log(`Starting KRA Kenya resources scrape...`);
    
    const { result, strategyUsed } = await scraperEngine.executeWithFallback({
      url: KRA_RESOURCES_URL,
      portalType: 'kra_ke_resources'
    });
    
    console.log(`Successfully scraped KRA using ${strategyUsed}.`);
    
    if (!result) return 0;

    const extractPrompt = `
      Extract a list of compliance resources (calculators, forms, guidelines, notices) from the following markdown scraped from the Kenya Revenue Authority (KRA) website.
      Only extract official resources (e.g. VAT Guidelines, KRA PIN Application forms, Housing Levy Calculator).

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

    const [ke] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'KE')).limit(1);
    if (!ke) return 0;

    const formattedResources = object.resources.map(r => ({
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
      .values(formattedResources)
      .returning({ id: complianceRequirements.id });

    console.log(`Successfully inserted ${inserted.length} KRA resources.`);
    return inserted.length;
  } catch (error) {
    console.error('Failed to scrape KRA resources:', error);
    return 0;
  }
}
