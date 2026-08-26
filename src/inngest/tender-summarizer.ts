import { inngest } from './client';
import { db } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { and, eq, isNull, lte } from 'drizzle-orm';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const BATCH_SIZE = 30;

export const summarizeTenderDocumentJob = inngest.createFunction(
  { 
    id: 'summarize-tender-documents', 
    name: '📄 Summarize Tenders (with or without PDF)',
    // Run daily at 13:00 UTC (16:00 EAT) — after morning scrapers finish
    triggers: [{ cron: '0 13 * * *' }, { event: 'manual.tender.summarize' }],
  },
  async ({ step, logger }) => {
    // Fetch tenders that have no aiSummary yet — regardless of documentUrl
    const pending = await step.run('fetch-pending-tenders', async () => {
      return db
        .select({
          id: tenders.id,
          title: tenders.title,
          description: tenders.description,
          contractingAuthority: tenders.contractingAuthority,
          category: tenders.category,
          status: tenders.status,
          budget: tenders.budget,
          currency: tenders.currency,
          deadline: tenders.deadline,
          documentUrl: tenders.documentUrl,
          countryId: tenders.countryId,
        })
        .from(tenders)
        .where(
          and(
            isNull(tenders.aiSummary),
            lte(tenders.createdAt, new Date()),
          )
        )
        .limit(BATCH_SIZE);
    });

    logger.info(`Found ${pending.length} tenders without summaries.`);
    if (pending.length === 0) return { status: 'nothing_to_process' };

    // Build country name map
    const countryRows = await step.run('fetch-countries', async () => {
      return db.select({ id: countries.id, name: countries.name }).from(countries);
    });
    const countryMap: Record<string, string> = {};
    countryRows.forEach((c) => { countryMap[c.id] = c.name; });

    let succeeded = 0;
    let failed = 0;

    for (const tender of pending) {
      await step.run(`summarize-${tender.id}`, async () => {
        try {
          const countryName = tender.countryId ? (countryMap[tender.countryId] ?? 'East Africa') : 'East Africa';
          let inputText = '';

          // Try PDF first if documentUrl is available
          if (tender.documentUrl) {
            try {
              const response = await fetch(tender.documentUrl, {
                signal: AbortSignal.timeout(12000),
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AkiliBrain/1.0)' },
              });
              if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                const { default: pdfParse } = await import('pdf-parse');
                const parsed = await pdfParse(buffer);
                inputText = parsed.text?.slice(0, 8000) ?? '';
              }
            } catch {
              logger.warn(`PDF fetch failed for tender ${tender.id}, falling back to metadata.`);
            }
          }

          // Fall back to metadata-based summary if no PDF text
          if (!inputText || inputText.trim().length < 50) {
            inputText = [
              `Tender Title: ${tender.title}`,
              `Contracting Authority: ${tender.contractingAuthority ?? 'Unknown'}`,
              `Country: ${countryName}`,
              `Category: ${tender.category ?? 'N/A'}`,
              `Status: ${tender.status ?? 'open'}`,
              tender.budget ? `Budget: ${tender.currency ?? ''} ${tender.budget}` : '',
              tender.deadline ? `Deadline: ${new Date(tender.deadline).toDateString()}` : '',
              tender.description ? `\nDescription:\n${tender.description.slice(0, 3000)}` : '',
            ].filter(Boolean).join('\n');
          }

          const { text: summary } = await generateText({
            model: google('gemini-2.0-flash'),
            prompt: `You are an expert procurement analyst for East Africa.
Analyze the following government tender information and return a concise JSON summary.

${inputText}

Return ONLY a raw JSON object (no markdown, no code block) with these exact keys:
{
  "summary": "2-sentence plain-language overview of what this tender is for and who should apply",
  "eligibility": "Key eligibility criteria for bidders as a bullet-list string",
  "requiredDocuments": "Documents typically required to apply for this type of tender",
  "keyDeadlines": "Critical dates mentioned, or 'See official notice for dates' if not specified",
  "estimatedValue": "Contract value or budget if mentioned, else null"
}`,
          });

          let parsedSummary: Record<string, unknown>;
          try {
            const jsonMatch = summary.match(/\{[\s\S]*\}/);
            parsedSummary = JSON.parse(jsonMatch ? jsonMatch[0] : summary);
          } catch {
            parsedSummary = { summary: summary.slice(0, 1000) };
          }

          await db
            .update(tenders)
            .set({ aiSummary: JSON.stringify(parsedSummary) })
            .where(eq(tenders.id, tender.id));

          succeeded++;
          logger.info(`Summarized tender ${tender.id}: ${tender.title}`);
        } catch (err) {
          failed++;
          logger.error(`Failed to summarize tender ${tender.id}: ${(err as Error).message}`);
          // Don't mark as errored — leave aiSummary null so we retry next run
        }
      });
    }

    return {
      status: 'done',
      processed: pending.length,
      succeeded,
      failed,
    };
  }
);
