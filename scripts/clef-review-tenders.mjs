import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { choice, noul } = require('@typesafe-ai/sdk');
import { systemOne } from './clef-client.mjs';
const jev = { systemOne };

import { db } from '../src/lib/db/client.ts';
import { tenderSectors, tenders } from '../src/lib/db/schema/tenders.ts';
import { eq } from 'drizzle-orm';

async function main() {
  console.log("Fetching sectors...");
  const sectors = await db.select().from(tenderSectors);
  const sectorSlugs = sectors.map(s => s.slug);
  const sectorMap = Object.fromEntries(sectors.map(s => [s.slug, s.id]));

  console.log(`Loaded ${sectors.length} sectors.`);

  const batchSize = 100;
  let offset = 0;
  
  let stats = {
    totalProcessed: 0,
    closedUpdated: 0,
    sectorUpdated: 0,
    employerUrlUpdated: 0,
    spamDeleted: 0,
    errors: 0
  };

  while (true) {
    const batch = await db.select().from(tenders).limit(batchSize).offset(offset).orderBy(tenders.id);
    if (batch.length === 0) break;

    console.log(`Processing batch ${offset} to ${offset + batch.length - 1}...`);

    let deletedInBatch = 0;
    const concurrency = 15;
    for (let i = 0; i < batch.length; i += concurrency) {
      const slice = batch.slice(i, i + concurrency);
      await Promise.all(slice.map(async (tender) => {
        try {
          const prompt = `Title: ${tender.title}\nDescription: ${tender.description || 'N/A'}`;
          
          // Check for spam/legitimacy
          try {
            const isLegit = await noul(jev, "Is this a legitimate tender, procurement, or job posting, and not spam/scam?", prompt);
            if (isLegit === false) {
              await db.delete(tenders).where(eq(tenders.id, tender.id));
              stats.spamDeleted++;
              deletedInBatch++;
              return; // skip further processing for this tender
            }
          } catch (err) {
            console.error(`Error checking legitimacy for tender ${tender.id}: ${err.message}`);
          }

          const updates = {};

          // a. If deadline < NOW() and status != 'closed', update status = 'closed'
          if (tender.deadline && new Date(tender.deadline) < new Date() && tender.status !== 'closed') {
            updates.status = 'closed';
            stats.closedUpdated++;
          }

          // b. Evaluate sector for EVERY tender
          try {
            const result = await choice(
              jev, 
              "Classify this tender into the most appropriate sector slug based on its title and description.",
              prompt,
              sectorSlugs
            );
            
            if (result && sectorMap[result] && sectorMap[result] !== tender.sectorId) {
              updates.sectorId = sectorMap[result];
              stats.sectorUpdated++;
            }
          } catch (err) {
            console.error(`Error classifying tender ${tender.id}: ${err.message}`);
          }

          // c. Set employer_url to source_url if missing and not an aggregator domain
          if (!tender.employerUrl && tender.isAggregatorSource === false) {
            updates.employerUrl = tender.sourceUrl;
            stats.employerUrlUpdated++;
          }

          if (Object.keys(updates).length > 0) {
            await db.update(tenders).set(updates).where(eq(tenders.id, tender.id));
          }
        } catch (err) {
          console.error(`Error processing tender ${tender.id}:`, err);
          stats.errors++;
        }
      }));
    }

    stats.totalProcessed += batch.length;
    // Adjust offset by subtracting the number of rows deleted in this batch,
    // so we don't skip the rows that shifted down.
    offset += batchSize - deletedInBatch;
  }

  console.log("Done!");
  console.log("Stats:", stats);
  process.exit(0);
}

main().catch(console.error);
