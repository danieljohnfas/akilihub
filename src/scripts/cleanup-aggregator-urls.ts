/**
 * DB Cleanup Script — Aggregator URL Enforcement
 *
 * Scans all jobs and tenders in the database and nullifies any employer_url
 * that resolves to a known aggregator domain. This ensures no aggregator URLs
 * are ever served to users as "Apply" links.
 *
 * Also sets is_aggregator_source = true for any row whose source_url is a known
 * aggregator, ensuring future rendering correctly shows "pending resolution".
 *
 * Run: npx tsx src/scripts/cleanup-aggregator-urls.ts
 */

import { db } from '../lib/db/client';
import { jobs } from '../lib/db/schema/jobs';
import { tenders } from '../lib/db/schema/tenders';
import { isAggregatorUrl, isEmployerUrl } from '../lib/sources/aggregators';
import { eq, isNotNull, sql } from 'drizzle-orm';

async function cleanupJobs() {
  console.log('\n=== Cleaning Jobs Table ===');

  // Fetch all jobs with a non-null employer_url
  const allJobs = await db
    .select({ id: jobs.id, employerUrl: jobs.employerUrl, sourceUrl: jobs.sourceUrl, isAggregatorSource: jobs.isAggregatorSource })
    .from(jobs)
    .where(isNotNull(jobs.employerUrl));

  console.log(`Checking ${allJobs.length} jobs with employerUrl set...`);

  let nullifiedEmployer = 0;
  let markedAggregator = 0;

  for (const job of allJobs) {
    const needsNullify = job.employerUrl && isAggregatorUrl(job.employerUrl);
    const sourceIsAgg = job.sourceUrl && isAggregatorUrl(job.sourceUrl);

    if (needsNullify || (sourceIsAgg && !job.isAggregatorSource)) {
      await db.update(jobs).set({
        ...(needsNullify ? { employerUrl: null } : {}),
        ...(sourceIsAgg ? { isAggregatorSource: true } : {}),
      }).where(eq(jobs.id, job.id));

      if (needsNullify) nullifiedEmployer++;
      if (sourceIsAgg && !job.isAggregatorSource) markedAggregator++;
    }
  }

  // Also fix jobs with no employer_url whose source_url is an aggregator but not flagged
  const unflaggedAggJobs = await db
    .select({ id: jobs.id, sourceUrl: jobs.sourceUrl })
    .from(jobs)
    .where(eq(jobs.isAggregatorSource, false));

  let fixedFlags = 0;
  for (const job of unflaggedAggJobs) {
    if (job.sourceUrl && isAggregatorUrl(job.sourceUrl)) {
      await db.update(jobs).set({ isAggregatorSource: true }).where(eq(jobs.id, job.id));
      fixedFlags++;
    }
  }

  console.log(`✅ Jobs: nullified ${nullifiedEmployer} aggregator employerUrls, marked ${markedAggregator + fixedFlags} rows as isAggregatorSource=true`);
}

async function cleanupTenders() {
  console.log('\n=== Cleaning Tenders Table ===');

  const allTenders = await db
    .select({ id: tenders.id, employerUrl: tenders.employerUrl, sourceUrl: tenders.sourceUrl, isAggregatorSource: tenders.isAggregatorSource })
    .from(tenders)
    .where(isNotNull(tenders.employerUrl));

  console.log(`Checking ${allTenders.length} tenders with employerUrl set...`);

  let nullifiedEmployer = 0;
  let markedAggregator = 0;

  for (const tender of allTenders) {
    const needsNullify = tender.employerUrl && isAggregatorUrl(tender.employerUrl);
    const sourceIsAgg = tender.sourceUrl && isAggregatorUrl(tender.sourceUrl);

    if (needsNullify || (sourceIsAgg && !tender.isAggregatorSource)) {
      await db.update(tenders).set({
        ...(needsNullify ? { employerUrl: null } : {}),
        ...(sourceIsAgg ? { isAggregatorSource: true } : {}),
      }).where(eq(tenders.id, tender.id));

      if (needsNullify) nullifiedEmployer++;
      if (sourceIsAgg && !tender.isAggregatorSource) markedAggregator++;
    }
  }

  // Fix unflagged aggregator source tenders
  const unflaggedAggTenders = await db
    .select({ id: tenders.id, sourceUrl: tenders.sourceUrl })
    .from(tenders)
    .where(eq(tenders.isAggregatorSource, false));

  let fixedFlags = 0;
  for (const tender of unflaggedAggTenders) {
    if (tender.sourceUrl && isAggregatorUrl(tender.sourceUrl)) {
      await db.update(tenders).set({ isAggregatorSource: true }).where(eq(tenders.id, tender.id));
      fixedFlags++;
    }
  }

  console.log(`✅ Tenders: nullified ${nullifiedEmployer} aggregator employerUrls, marked ${markedAggregator + fixedFlags} rows as isAggregatorSource=true`);
}

async function main() {
  console.log('=== AGGREGATOR URL CLEANUP START ===', new Date().toISOString());
  
  await cleanupJobs();
  await cleanupTenders();

  console.log('\n=== AGGREGATOR URL CLEANUP DONE ===', new Date().toISOString());
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
