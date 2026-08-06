import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { complianceRequirements } from '../src/lib/db/schema/compliance';
import { healthDataPoints, healthIndicators } from '../src/lib/db/schema/health';
import { countries, regions } from '../src/lib/db/schema/shared';
import { fetchHtml, htmlToTextEnriched } from '../src/lib/scrapers/compliance-base';
import { extractJobsWithAI } from '../src/lib/scrapers/broad-search-engine';
import { extractTendersWithAI } from '../src/lib/scrapers/broad-search-engine-tenders';
import { extractComplianceWithAI } from '../src/lib/scrapers/broad-search-engine-compliance';
import { extractHealthWithAI } from '../src/lib/scrapers/broad-search-engine-health';
import { resolveEmployerUrl, classifySourceUrl } from '../src/lib/sources/employer-resolver';
import { eq, isNotNull, asc, desc, and, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// ── TELEMETRY STATE ────────────────────────────────────────────────────────
const TELEMETRY_FILE = path.join(__dirname, 'audit_telemetry.json');

interface AuditTelemetry {
  startTime: string;
  lastUpdated: string;
  status: 'INITIALIZING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  totalUrls: number;
  urlsRevisited: number;
  recordsEnriched: number;
  employerUrlsResolved: number;
  documentsParsed: number;
  imageFlyersParsed: number;
  errorsEncountered: number;
  errorsSelfHealed: number;
  byModule: {
    jobs: { total: number; processed: number; enriched: number; employerResolved: number };
    tenders: { total: number; processed: number; enriched: number; employerResolved: number };
    compliance: { total: number; processed: number; enriched: number; employerResolved: number };
    health: { total: number; processed: number; enriched: number; employerResolved: number };
  };
  recentLogs: string[];
}

let telemetry: AuditTelemetry = {
  startTime: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  status: 'INITIALIZING',
  totalUrls: 0,
  urlsRevisited: 0,
  recordsEnriched: 0,
  employerUrlsResolved: 0,
  documentsParsed: 0,
  imageFlyersParsed: 0,
  errorsEncountered: 0,
  errorsSelfHealed: 0,
  byModule: {
    jobs: { total: 0, processed: 0, enriched: 0, employerResolved: 0 },
    tenders: { total: 0, processed: 0, enriched: 0, employerResolved: 0 },
    compliance: { total: 0, processed: 0, enriched: 0, employerResolved: 0 },
    health: { total: 0, processed: 0, enriched: 0, employerResolved: 0 },
  },
  recentLogs: [],
};

if (fs.existsSync(TELEMETRY_FILE)) {
  try {
    const raw = fs.readFileSync(TELEMETRY_FILE, 'utf-8');
    const existing = JSON.parse(raw);
    telemetry = {
      ...telemetry,
      ...existing,
      status: 'RUNNING',
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    // fallback to initial telemetry
  }
}

function saveTelemetry(logMessage?: string) {
  telemetry.lastUpdated = new Date().toISOString();
  if (logMessage) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const formatted = `[${timestamp}] ${logMessage}`;
    telemetry.recentLogs.push(formatted);
    if (telemetry.recentLogs.length > 50) telemetry.recentLogs.shift();
    console.log(formatted);
  }
  try {
    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(telemetry, null, 2), 'utf-8');
  } catch {
    // Ignore telemetry write errors
  }
}

// ── UTILITIES ──────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeDbUpdate(table: any, updates: Record<string, any>, whereClause: any, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.update(table).set(updates).where(whereClause);
      return true;
    } catch (err: any) {
      if (attempt === maxRetries) {
        return false;
      }
      await sleep(1000 * attempt);
    }
  }
  return false;
}

// ── 1. JOBS AUDIT & REVISIT ────────────────────────────────────────────────
async function auditJobs() {
  saveTelemetry('--- Starting Jobs Global Audit & Revisit (All 9 Countries) ---');

  // Fetch all active jobs ordered by oldest updatedAt
  const allJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      requirements: jobs.requirements,
      jobType: jobs.jobType,
      postedDate: jobs.postedDate,
      deadline: jobs.deadline,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      sourceUrl: jobs.sourceUrl,
      employerUrl: jobs.employerUrl,
      location: jobs.location,
      countryId: jobs.countryId,
      regionId: jobs.regionId,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .where(and(eq(jobs.isActive, true), isNotNull(jobs.sourceUrl)))
    .orderBy(asc(jobs.updatedAt));

  telemetry.byModule.jobs.total = allJobs.length;

  const pendingJobs = allJobs.filter((j) => !j.updatedAt || new Date(j.updatedAt) < new Date(telemetry.startTime));
  if (pendingJobs.length === 0) {
    telemetry.byModule.jobs.processed = allJobs.length;
    saveTelemetry(`All ${allJobs.length} active jobs already verified & enriched in this pass. Proceeding to Tenders.`);
    return;
  }

  saveTelemetry(`Found ${pendingJobs.length} remaining active jobs to revisit out of ${allJobs.length} total.`);

  for (let i = 0; i < pendingJobs.length; i++) {
    const job = pendingJobs[i];
    const url = job.sourceUrl!;
    telemetry.byModule.jobs.processed++;
    telemetry.urlsRevisited++;

    try {
      // 1. Fetch live content (HTML + attached PDFs + image flyers)
      const html = await fetchHtml(url);
      if (!html) {
        saveTelemetry(`[Jobs ${i + 1}/${pendingJobs.length}] Fetch failed/empty for ${url.slice(0, 70)}... Skipping.`);
        await safeDbUpdate(jobs, { updatedAt: new Date() }, eq(jobs.id, job.id));
        continue;
      }

      const { text, pdfLinks, images } = await htmlToTextEnriched(html, url);
      if (pdfLinks && pdfLinks.length > 0) telemetry.documentsParsed += pdfLinks.length;
      if (images && images.length > 0) telemetry.imageFlyersParsed += images.length;

      // 2. Multimodal AI Extraction
      const extractedList = await extractJobsWithAI(text, url);
      if (!extractedList || extractedList.length === 0) {
        // Source had no parseable jobs, bump updatedAt to prevent tight loops
        await safeDbUpdate(jobs, { updatedAt: new Date() }, eq(jobs.id, job.id));
        continue;
      }

      // Match best job candidate on page
      let match = extractedList[0];
      for (const ex of extractedList) {
        if (
          ex.title.toLowerCase().includes(job.title.toLowerCase()) ||
          job.title.toLowerCase().includes(ex.title.toLowerCase())
        ) {
          match = ex;
          break;
        }
      }

      // 3. Resolve Direct Employer URL if missing or aggregator
      let resolvedEmployer = job.employerUrl;
      if (!resolvedEmployer) {
        const resolution = await resolveEmployerUrl(url);
        if (resolution.employerUrl) {
          resolvedEmployer = resolution.employerUrl;
          telemetry.employerUrlsResolved++;
          telemetry.byModule.jobs.employerResolved++;
        }
      }

      // 4. Comprehensiveness Gate & Delta Comparison
      const currentDescLen = (job.description || '').length;
      const newDescLen = (match.description || '').length;
      const currentReqLen = (job.requirements || '').length;
      const newReqLen = (match.requirements || '').length;

      const updates: Record<string, any> = { updatedAt: new Date() };
      let hasEnrichment = false;

      // Description & Scope upgrade
      if (newDescLen > currentDescLen + 20) {
        updates.description = match.description;
        hasEnrichment = true;
      }

      // Requirements upgrade
      if (newReqLen > currentReqLen + 20) {
        updates.requirements = match.requirements;
        hasEnrichment = true;
      }

      // Location / Address / Postal precision
      const matchLoc = (match as any).location;
      if (matchLoc && (!job.location || job.location.length < matchLoc.length)) {
        updates.location = matchLoc;
        hasEnrichment = true;
      }

      // Salary / Compensation
      if (!job.salaryMin && match.salaryMin) {
        updates.salaryMin = String(match.salaryMin);
        hasEnrichment = true;
      }
      if (!job.salaryMax && match.salaryMax) {
        updates.salaryMax = String(match.salaryMax);
        hasEnrichment = true;
      }
      if (!job.salaryCurrency && match.salaryCurrency) {
        updates.salaryCurrency = match.salaryCurrency;
        hasEnrichment = true;
      }

      // Deadline & Dates
      if (!job.deadline && match.deadline) {
        updates.deadline = match.deadline;
        hasEnrichment = true;
      }
      if (!job.postedDate && match.postedDate) {
        updates.postedDate = match.postedDate;
        hasEnrichment = true;
      }

      // Employer URL
      if (resolvedEmployer && resolvedEmployer !== job.employerUrl) {
        updates.employerUrl = resolvedEmployer;
        hasEnrichment = true;
      }

      // Apply updates to DB
      await safeDbUpdate(jobs, updates, eq(jobs.id, job.id));

      if (hasEnrichment) {
        telemetry.recordsEnriched++;
        telemetry.byModule.jobs.enriched++;
        saveTelemetry(
          `[Jobs ${i + 1}/${pendingJobs.length}] Enriched "${match.title.slice(0, 40)}" (Desc: +${Math.max(0, newDescLen - currentDescLen)} chars, Employer: ${resolvedEmployer ? 'YES' : 'NO'})`
        );
      } else {
        saveTelemetry(`[Jobs ${i + 1}/${pendingJobs.length}] Verified "${job.title.slice(0, 40)}" (Already fully comprehensive).`);
      }
    } catch (err: any) {
      telemetry.errorsEncountered++;
      telemetry.errorsSelfHealed++;
      if (err.code === '23505') {
        saveTelemetry(`[Jobs ${i + 1}/${pendingJobs.length}] Handled duplicate URL slug (23505). Touch timestamp.`);
      } else {
        saveTelemetry(`[Jobs ${i + 1}/${pendingJobs.length}] Resumed after error: ${err.message?.slice(0, 80)}`);
      }
      await safeDbUpdate(jobs, { updatedAt: new Date() }, eq(jobs.id, job.id));
    }

    saveTelemetry();
    await sleep(600); // Polite rate limit delay
  }
}

// ── 2. TENDERS AUDIT & REVISIT ─────────────────────────────────────────────
async function auditTenders() {
  saveTelemetry('--- Starting Tenders Global Audit & Revisit (All 9 Countries) ---');

  const allTenders = await db
    .select({
      id: tenders.id,
      title: tenders.title,
      description: tenders.description,
      category: tenders.category,
      deadline: tenders.deadline,
      budget: tenders.budget,
      sourceUrl: tenders.sourceUrl,
      employerUrl: tenders.employerUrl,
      updatedAt: tenders.updatedAt,
    })
    .from(tenders)
    .where(and(eq(tenders.status, 'open'), isNotNull(tenders.sourceUrl)))
    .orderBy(asc(tenders.updatedAt));

  telemetry.byModule.tenders.total = allTenders.length;

  const pendingTenders = allTenders.filter((t) => !t.updatedAt || new Date(t.updatedAt) < new Date(telemetry.startTime));
  if (pendingTenders.length === 0) {
    telemetry.byModule.tenders.processed = allTenders.length;
    saveTelemetry(`All ${allTenders.length} open tenders already verified & enriched in this pass. Proceeding to Compliance.`);
    return;
  }

  saveTelemetry(`Found ${pendingTenders.length} remaining open tenders to revisit out of ${allTenders.length} total.`);

  for (let i = 0; i < pendingTenders.length; i++) {
    const tender = pendingTenders[i];
    const url = tender.sourceUrl!;
    telemetry.byModule.tenders.processed++;
    telemetry.urlsRevisited++;

    try {
      const html = await fetchHtml(url);
      if (!html) {
        saveTelemetry(`[Tenders ${i + 1}/${pendingTenders.length}] Fetch empty for ${url.slice(0, 70)}... Skipping.`);
        await safeDbUpdate(tenders, { updatedAt: new Date() }, eq(tenders.id, tender.id));
        continue;
      }

      const { text, pdfLinks, images } = await htmlToTextEnriched(html, url);
      if (pdfLinks && pdfLinks.length > 0) telemetry.documentsParsed += pdfLinks.length;
      if (images && images.length > 0) telemetry.imageFlyersParsed += images.length;

      const extractedList = await extractTendersWithAI(text, url, pdfLinks);
      if (!extractedList || extractedList.length === 0) {
        await safeDbUpdate(tenders, { updatedAt: new Date() }, eq(tenders.id, tender.id));
        continue;
      }

      const match = extractedList[0];

      // Resolve Direct Employer/Procuring Authority URL
      let resolvedEmployer = tender.employerUrl;
      if (!resolvedEmployer) {
        const resolution = await resolveEmployerUrl(url);
        if (resolution.employerUrl) {
          resolvedEmployer = resolution.employerUrl;
          telemetry.employerUrlsResolved++;
          telemetry.byModule.tenders.employerResolved++;
        }
      }

      const currentDescLen = (tender.description || '').length;
      const newDescLen = (match.description || '').length;

      const updates: Record<string, any> = { updatedAt: new Date() };
      let hasEnrichment = false;

      if (newDescLen > currentDescLen + 20) {
        updates.description = match.description;
        hasEnrichment = true;
      }
      if (!tender.budget && match.budget) {
        updates.budget = String(match.budget);
        hasEnrichment = true;
      }
      if (!tender.deadline && match.deadline) {
        updates.deadline = match.deadline;
        hasEnrichment = true;
      }
      if (match.category && match.category !== tender.category) {
        updates.category = match.category;
        hasEnrichment = true;
      }
      if (resolvedEmployer && resolvedEmployer !== tender.employerUrl) {
        updates.employerUrl = resolvedEmployer;
        hasEnrichment = true;
      }

      await safeDbUpdate(tenders, updates, eq(tenders.id, tender.id));

      if (hasEnrichment) {
        telemetry.recordsEnriched++;
        telemetry.byModule.tenders.enriched++;
        saveTelemetry(
          `[Tenders ${i + 1}/${pendingTenders.length}] Enriched "${match.title.slice(0, 40)}" (Scope: +${Math.max(0, newDescLen - currentDescLen)} chars)`
        );
      } else {
        saveTelemetry(`[Tenders ${i + 1}/${pendingTenders.length}] Verified "${tender.title.slice(0, 40)}" (Complete).`);
      }
    } catch (err: any) {
      telemetry.errorsEncountered++;
      telemetry.errorsSelfHealed++;
      saveTelemetry(`[Tenders ${i + 1}/${pendingTenders.length}] Handled error: ${err.message?.slice(0, 80)}`);
      await safeDbUpdate(tenders, { updatedAt: new Date() }, eq(tenders.id, tender.id));
    }

    saveTelemetry();
    await sleep(600);
  }
}

// ── 3. COMPLIANCE AUDIT & REVISIT ──────────────────────────────────────────
async function auditCompliance() {
  saveTelemetry('--- Starting Compliance Global Audit & Revisit (All 9 Countries) ---');

  const allReqs = await db
    .select({
      id: complianceRequirements.id,
      title: complianceRequirements.title,
      description: complianceRequirements.description,
      category: complianceRequirements.category,
      issuingAuthority: complianceRequirements.issuingAuthority,
      resourceType: complianceRequirements.resourceType,
      sourceUrl: complianceRequirements.sourceUrl,
      employerUrl: complianceRequirements.employerUrl,
      updatedAt: complianceRequirements.updatedAt,
    })
    .from(complianceRequirements)
    .where(isNotNull(complianceRequirements.sourceUrl))
    .orderBy(asc(complianceRequirements.updatedAt));

  telemetry.byModule.compliance.total = allReqs.length;

  const pendingReqs = allReqs.filter((r) => !r.updatedAt || new Date(r.updatedAt) < new Date(telemetry.startTime));
  if (pendingReqs.length === 0) {
    telemetry.byModule.compliance.processed = allReqs.length;
    saveTelemetry(`All ${allReqs.length} compliance requirements already verified & enriched in this pass. Proceeding to Health.`);
    return;
  }

  saveTelemetry(`Found ${pendingReqs.length} remaining compliance requirements to revisit out of ${allReqs.length} total.`);

  for (let i = 0; i < pendingReqs.length; i++) {
    const req = pendingReqs[i];
    const url = req.sourceUrl!;
    telemetry.byModule.compliance.processed++;
    telemetry.urlsRevisited++;

    try {
      const html = await fetchHtml(url);
      if (!html) {
        await safeDbUpdate(complianceRequirements, { updatedAt: new Date() }, eq(complianceRequirements.id, req.id));
        continue;
      }

      const { text, pdfLinks, images } = await htmlToTextEnriched(html, url);
      if (pdfLinks && pdfLinks.length > 0) telemetry.documentsParsed += pdfLinks.length;
      if (images && images.length > 0) telemetry.imageFlyersParsed += images.length;

      const extractedList = await extractComplianceWithAI(text, url, pdfLinks);
      if (!extractedList || extractedList.length === 0) {
        await safeDbUpdate(complianceRequirements, { updatedAt: new Date() }, eq(complianceRequirements.id, req.id));
        continue;
      }

      const match = extractedList[0];

      // Resolve Direct Authority URL
      let resolvedEmployer = req.employerUrl;
      if (!resolvedEmployer) {
        const resolution = await resolveEmployerUrl(url);
        if (resolution.employerUrl) {
          resolvedEmployer = resolution.employerUrl;
          telemetry.employerUrlsResolved++;
          telemetry.byModule.compliance.employerResolved++;
        }
      }

      const currentDescLen = (req.description || '').length;
      const newDescLen = (match.description || '').length;

      const updates: Record<string, any> = { updatedAt: new Date() };
      let hasEnrichment = false;

      if (newDescLen > currentDescLen + 20) {
        updates.description = match.description;
        hasEnrichment = true;
      }
      if (match.issuingAuthority && (!req.issuingAuthority || req.issuingAuthority === 'Various')) {
        updates.issuingAuthority = match.issuingAuthority;
        hasEnrichment = true;
      }
      if (resolvedEmployer && resolvedEmployer !== req.employerUrl) {
        updates.employerUrl = resolvedEmployer;
        hasEnrichment = true;
      }

      await safeDbUpdate(complianceRequirements, updates, eq(complianceRequirements.id, req.id));

      if (hasEnrichment) {
        telemetry.recordsEnriched++;
        telemetry.byModule.compliance.enriched++;
        saveTelemetry(`[Compliance ${i + 1}/${pendingReqs.length}] Enriched "${match.title.slice(0, 40)}"`);
      } else {
        saveTelemetry(`[Compliance ${i + 1}/${pendingReqs.length}] Verified "${req.title.slice(0, 40)}" (Complete).`);
      }
    } catch (err: any) {
      telemetry.errorsEncountered++;
      telemetry.errorsSelfHealed++;
      saveTelemetry(`[Compliance ${i + 1}/${pendingReqs.length}] Handled error: ${err.message?.slice(0, 80)}`);
      await safeDbUpdate(complianceRequirements, { updatedAt: new Date() }, eq(complianceRequirements.id, req.id));
    }

    saveTelemetry();
    await sleep(600);
  }
}

// ── 4. HEALTH AUDIT & REVISIT ──────────────────────────────────────────────
async function auditHealth() {
  saveTelemetry('--- Starting Health Global Audit & Revisit (All 9 Countries) ---');

  const allHealth = await db
    .select({
      id: healthDataPoints.id,
      indicatorId: healthDataPoints.indicatorId,
      value: healthDataPoints.value,
      year: healthDataPoints.year,
      source: healthDataPoints.source,
    })
    .from(healthDataPoints)
    .where(isNotNull(healthDataPoints.source));

  telemetry.byModule.health.total = allHealth.length;
  saveTelemetry(`Found ${allHealth.length} health data records to revisit.`);

  for (let i = 0; i < allHealth.length; i++) {
    const item = allHealth[i];
    const url = item.source!;
    telemetry.byModule.health.processed++;
    telemetry.urlsRevisited++;

    try {
      const html = await fetchHtml(url);
      if (!html) continue;

      const { text, pdfLinks } = await htmlToTextEnriched(html, url);
      const extractedList = await extractHealthWithAI(text, url, pdfLinks);
      if (!extractedList || extractedList.length === 0) continue;

      const match = extractedList[0];
      if (match && match.value) {
        await safeDbUpdate(
          healthDataPoints,
          {
            value: String(match.value),
            year: match.year || item.year,
          },
          eq(healthDataPoints.id, item.id)
        );

        telemetry.recordsEnriched++;
        telemetry.byModule.health.enriched++;
        saveTelemetry(`[Health ${i + 1}/${allHealth.length}] Updated indicator value: ${match.value}`);
      }
    } catch (err: any) {
      telemetry.errorsEncountered++;
      telemetry.errorsSelfHealed++;
    }

    saveTelemetry();
    await sleep(500);
  }
}

// ── MASTER ENTRYPOINT ──────────────────────────────────────────────────────
async function main() {
  telemetry.status = 'RUNNING';
  saveTelemetry('🚀 Global Online Data Audit & Revisit Pipeline Initiated.');

  let attempts = 0;
  while (attempts < 10) {
    try {
      await auditJobs();
      await auditTenders();
      await auditCompliance();
      await auditHealth();

      telemetry.status = 'COMPLETED';
      saveTelemetry('✅ Complete 9-Country Data Audit & Revisit FINISHED Successfully.');
      break;
    } catch (fatal: any) {
      attempts++;
      telemetry.errorsEncountered++;
      telemetry.errorsSelfHealed++;
      saveTelemetry(`Recovered from unexpected error in loop (Attempt ${attempts}): ${fatal.message}. Retrying in 5s...`);
      await sleep(5000);
    }
  }

  process.exit(0);
}

main().catch(console.error);
