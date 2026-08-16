import { inngest } from './client';
import { db } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { PDFParse as pdfParse } from 'pdf-parse';

const BATCH_SIZE = 20;

export const summarizeTenderDocumentJob = inngest.createFunction(
  { 
    id: 'summarize-tender-documents', 
    name: '📄 Summarize Tender PDFs',
    // Run daily at 13:00 UTC (16:00 EAT) — after morning scrapers finish
    triggers: [{ cron: '0 13 * * *' }] 
  },
  async ({ step, logger }) => {
    // Fetch tenders that have a documentUrl but no aiSummary yet
    const pending = await step.run('fetch-pending-tenders', async () => {
      return db
        .select({ id: tenders.id, title: tenders.title, documentUrl: tenders.documentUrl })
        .from(tenders)
        .where(
          and(
            isNotNull(tenders.documentUrl),
            isNull(tenders.aiSummary),
            lte(tenders.createdAt, new Date()) // only process already-saved tenders
          )
        )
        .limit(BATCH_SIZE);
    });

    logger.info(`Found ${pending.length} tenders with unprocessed PDFs.`);
    if (pending.length === 0) return { status: 'nothing_to_process' };

    let succeeded = 0;
    let failed = 0;

    for (const tender of pending) {
      await step.run(`summarize-${tender.id}`, async () => {
        try {
          // 1. Download the PDF
          const response = await fetch(tender.documentUrl!, {
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AkiliBrain/1.0)' },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching PDF`);
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          const parser = new PDFParse({ data: buffer });
          const result = await parser.getText();
          const text = result.text;

          // Trim text to avoid excessive token usage (~8000 chars ≈ ~2000 tokens)
          const trimmedText = text.slice(0, 8000);

          if (!trimmedText || trimmedText.trim().length < 100) {
            throw new Error('PDF text too short or empty after parsing');
          }

          // 2. Ask Gemini to summarize
          const { text: summary } = await generateText({
            model: google('gemini-2.0-flash'),
            prompt: `You are an expert procurement analyst for East Africa. 
Analyze the following government tender document and extract a concise structured summary.

TENDER TITLE: ${tender.title}

DOCUMENT TEXT:
${trimmedText}

Return a JSON object with these exact keys (no markdown, no code block, raw JSON only):
{
  "summary": "2-sentence plain-language overview of what this tender is for",
  "eligibility": "Key eligibility requirements for bidders (bullet points as a single string)",
  "requiredDocuments": "List of documents required to apply (bullet points as a single string)",
  "keyDeadlines": "Critical dates and deadlines mentioned",
  "estimatedValue": "Estimated contract value or budget if mentioned, else null"
}`,
          });

          // 3. Parse the JSON from the response
          let parsedSummary: Record<string, unknown>;
          try {
            const jsonMatch = summary.match(/\{[\s\S]*\}/);
            parsedSummary = JSON.parse(jsonMatch ? jsonMatch[0] : summary);
          } catch {
            // If JSON parse fails, save raw text under "summary" key
            parsedSummary = { summary: summary.slice(0, 1000) };
          }

          // 4. Save to DB
          await db
            .update(tenders)
            .set({ aiSummary: JSON.stringify(parsedSummary) })
            .where(eq(tenders.id, tender.id));

          succeeded++;
          logger.info(`Summarized tender ${tender.id}: ${tender.title}`);
        } catch (err) {
          failed++;
          logger.error(`Failed to summarize tender ${tender.id}: ${(err as Error).message}`);
          // Mark with a placeholder so we don't retry endlessly on a broken PDF
          await db
            .update(tenders)
            .set({ aiSummary: JSON.stringify({ error: (err as Error).message }) })
            .where(eq(tenders.id, tender.id));
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
