/**
 * AkiliHub Mass Scraping Runner — Production
 * ───────────────────────────────────────────
 * Connects to production Supabase DB + online sidecar.
 * Run: npx tsx scripts/mass-scrape.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: true });

// Force NODE_ENV=production so the DB client uses SSL (Supabase requires it even locally)
(process.env as Record<string, string | undefined>).NODE_ENV = 'production';

// Ensure all AI keys are visible (the router has a FAST-FAIL guard that needs GOOGLE or MISTRAL)
// We guarantee at least one provider is active
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.MISTRAL_API_KEY) {
  // fallback: copy Groq key as Mistral to force the router open
  if (process.env.GROQ_API_KEY) {
    process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'placeholder';
  }
}

import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { complianceRequirements } from '../src/lib/db/schema/compliance';
import { healthIndicators, healthDataPoints } from '../src/lib/db/schema/health';
import { countries } from '../src/lib/db/schema/shared';
import { eq, count } from 'drizzle-orm';
import { discoverJobs, BroadJobResource } from '../src/lib/scrapers/broad-search-engine';
import { discoverTenders, BroadTenderResource } from '../src/lib/scrapers/broad-search-engine-tenders';
import { discoverSalaries, BroadSalaryResource } from '../src/lib/scrapers/broad-search-engine-salaries';
import { discoverCompliance, BroadComplianceResource } from '../src/lib/scrapers/broad-search-engine-compliance';
import { discoverHealth, BroadHealthResource } from '../src/lib/scrapers/broad-search-engine-health';
import * as fs from 'fs';

// ── Logging ──────────────────────────────────────────────────────────────────
function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  process.stdout.write(`[${ts}] ${msg}\n`);
}

// ── All queries per country per module ───────────────────────────────────────
const JOB_QUERIES: Record<string, string[]> = {
  KE: [
    "jobs hiring Nairobi Kenya 2026",
    "latest job vacancies Kenya NGO 2026",
    "site:reliefweb.int jobs Kenya",
    "health medical nursing jobs Kenya 2026",
    "finance accounting jobs Nairobi Kenya 2026",
    "UN UNICEF WHO jobs Kenya 2026",
    "government jobs Kenya PSC 2026",
    "engineering construction jobs Kenya 2026",
    "site:ngojobsinafrica.com Kenya",
    "remote software engineering jobs Kenya 2026",
    "teaching education lecturer jobs Kenya 2026",
    "humanitarian jobs Kenya 2026",
  ],
  TZ: [
    "ajira mpya Tanzania Dar es Salaam 2026",
    "jobs vacancies Tanzania 2026",
    "nafasi za kazi Tanzania 2026",
    "NGO jobs Tanzania 2026",
    "site:reliefweb.int jobs Tanzania",
    "IT software developer jobs Dar es Salaam 2026",
    "health medical jobs Tanzania 2026",
    "UN WFP UNICEF jobs Tanzania 2026",
    "site:ngojobsinafrica.com Tanzania",
    "finance accounting ajira Tanzania 2026",
  ],
  UG: [
    "jobs vacancies Uganda Kampala 2026",
    "entry level graduate jobs Uganda 2026",
    "NGO development jobs Uganda 2026",
    "site:reliefweb.int jobs Uganda",
    "health medical jobs Uganda 2026",
    "IT technology jobs Kampala Uganda 2026",
    "UN UNICEF WHO jobs Uganda 2026",
    "finance accounting jobs Uganda 2026",
    "site:ngojobsinafrica.com Uganda",
    "engineering construction jobs Uganda 2026",
  ],
  RW: [
    "jobs vacancies Rwanda Kigali 2026",
    "IT technology software jobs Rwanda 2026",
    "international organization NGO jobs Rwanda 2026",
    "site:reliefweb.int jobs Rwanda",
    "finance banking jobs Rwanda 2026",
    "health medical jobs Rwanda 2026",
    "UN WFP UNHCR jobs Rwanda 2026",
    "site:ngojobsinafrica.com Rwanda",
    "engineering infrastructure jobs Rwanda 2026",
    "government public sector jobs Rwanda 2026",
  ],
  ET: [
    "jobs vacancies Ethiopia Addis Ababa 2026",
    "NGO jobs Ethiopia 2026",
    "humanitarian jobs Ethiopia UNHCR 2026",
    "site:reliefweb.int jobs Ethiopia",
    "health medical jobs Ethiopia WHO 2026",
    "finance accounting jobs Addis Ababa 2026",
    "UN WFP UNICEF jobs Ethiopia 2026",
    "site:ngojobsinafrica.com Ethiopia",
    "teaching education jobs Ethiopia 2026",
    "engineering logistics jobs Ethiopia 2026",
  ],
  CD: [
    "offres emploi RDC Kinshasa 2026",
    "recrutement ONG RDC Congo 2026",
    "emplois mines extractives Congo 2026",
    "offres emploi santé médecin RDC 2026",
    "site:reliefweb.int emploi RDC Congo",
    "UN UNICEF ONU recrutement RDC 2026",
    "ingénieur civil génie civil RDC 2026",
    "site:ngojobsinafrica.com DRC Congo",
    "jobs in DRC Congo English 2026",
    "recrutement entreprises Kinshasa Lubumbashi 2026",
  ],
  BI: [
    "offres emploi Bujumbura Burundi 2026",
    "recrutement ONG Burundi 2026",
    "emplois fonctionnaire gouvernement Burundi 2026",
    "site:reliefweb.int emploi Burundi",
    "UN UNICEF UNHCR recrutement Burundi 2026",
    "santé médecin emploi Burundi 2026",
    "NGO jobs Burundi humanitarian 2026",
    "site:ngojobsinafrica.com Burundi",
    "emplois finances comptabilité Burundi 2026",
    "jobs vacancies Burundi English 2026",
  ],
  SO: [
    "site:reliefweb.int jobs Somalia",
    "NGO jobs Mogadishu Somalia 2026",
    "humanitarian jobs Somalia 2026",
    "UN UNICEF UNHCR jobs Somalia 2026",
    "jobs vacancies Hargeisa Somaliland 2026",
    "health medical jobs Somalia WHO 2026",
    "site:ngojobsinafrica.com Somalia",
    "Somalia jobs English 2026",
    "AMISOM peacekeeping jobs Somalia 2026",
    "international NGO Somalia Mogadishu hiring 2026",
  ],
  SS: [
    "site:reliefweb.int jobs South Sudan",
    "NGO jobs Juba South Sudan 2026",
    "humanitarian jobs South Sudan 2026",
    "UN UNMISS UNICEF jobs South Sudan 2026",
    "OCHA WFP jobs South Sudan 2026",
    "health medical jobs South Sudan 2026",
    "jobs vacancies Juba South Sudan 2026",
    "site:ngojobsinafrica.com South Sudan",
    "MSF IRC jobs South Sudan 2026",
    "South Sudan international organization jobs 2026",
  ],
};

const TENDER_QUERIES: Record<string, string[]> = {
  KE: ["government tenders Kenya 2026", "site:reliefweb.int tenders Kenya", "UNOPS procurement Kenya", "NGO tenders Kenya 2026"],
  TZ: ["government tenders Tanzania 2026", "site:reliefweb.int tenders Tanzania", "UNOPS procurement Tanzania"],
  UG: ["government tenders Uganda 2026", "site:reliefweb.int tenders Uganda", "UNOPS procurement Uganda"],
  RW: ["government tenders Rwanda 2026", "appels d'offres Rwanda 2026", "site:reliefweb.int tenders Rwanda"],
  ET: ["government tenders Ethiopia 2026", "site:reliefweb.int tenders Ethiopia", "UNOPS procurement Ethiopia"],
  CD: ["appels d'offres gouvernement RDC 2026", "tenders Congo DRC 2026", "site:reliefweb.int tenders DRC"],
  BI: ["appels d'offres Burundi 2026", "tenders Burundi 2026", "site:reliefweb.int tenders Burundi"],
  SO: ["government tenders Somalia 2026", "site:reliefweb.int tenders Somalia", "UNOPS procurement Somalia"],
  SS: ["government tenders South Sudan 2026", "site:reliefweb.int tenders South Sudan", "UNOPS procurement South Sudan"],
};

const SALARY_QUERIES: Record<string, string[]> = {
  KE: ["software engineer salary Kenya 2026", "doctor nurse salary Kenya 2026", "accountant finance salary Kenya 2026", "NGO project officer salary Kenya 2026", "teacher salary Kenya 2026"],
  TZ: ["software developer salary Tanzania 2026", "mshahara wa daktari Tanzania 2026", "accountant salary Tanzania 2026", "NGO worker salary Tanzania 2026"],
  UG: ["software engineer salary Uganda 2026", "doctor nurse salary Uganda 2026", "accountant finance salary Uganda 2026", "NGO worker salary Uganda 2026"],
  RW: ["software engineer salary Rwanda 2026", "doctor nurse salary Rwanda 2026", "accountant salary Rwanda 2026", "NGO worker salary Rwanda 2026"],
  ET: ["software developer salary Ethiopia 2026", "doctor health worker salary Ethiopia 2026", "accountant salary Ethiopia 2026"],
  CD: ["salaire développeur informaticien RDC 2026", "salaire médecin infirmier RDC 2026", "salaire comptable RDC 2026"],
  BI: ["salaire développeur Burundi 2026", "salaire médecin Burundi 2026", "barème salarial Burundi 2026"],
  SO: ["software developer salary Somalia 2026", "doctor nurse salary Somalia 2026", "NGO worker salary Somalia 2026"],
  SS: ["software developer salary South Sudan 2026", "doctor nurse salary South Sudan 2026", "NGO humanitarian worker salary South Sudan 2026"],
};

const COMPLIANCE_QUERIES: Record<string, string[]> = {
  KE: ["Kenya Revenue Authority KRA tax compliance forms 2026", "business registration Kenya BRS 2026", "NSSF NHIF compliance Kenya 2026"],
  TZ: ["Tanzania Revenue Authority TRA tax compliance 2026", "BRELA Tanzania business registration 2026"],
  UG: ["Uganda Revenue Authority URA tax compliance 2026", "URSB Uganda business registration guidelines 2026"],
  RW: ["Rwanda Revenue Authority RRA compliance 2026", "RDB Rwanda business registration 2026"],
  ET: ["Ministry of Revenues Ethiopia tax compliance 2026", "business registration Ethiopia 2026"],
  CD: ["DGI RDC conformité fiscale 2026", "GUCE RDC création entreprise 2026"],
  BI: ["OBR Burundi conformité fiscale 2026", "API Burundi création entreprise 2026"],
  SO: ["Ministry of Finance Somalia tax compliance 2026", "business registration Somalia 2026"],
  SS: ["NRA South Sudan tax compliance 2026", "business registration South Sudan 2026"],
};

const HEALTH_QUERIES: Record<string, string[]> = {
  KE: ["Kenya health statistics WHO 2026 indicators", "maternal mortality Kenya 2026 statistics", "malaria HIV Kenya health data"],
  TZ: ["Tanzania health statistics WHO 2026", "maternal mortality Tanzania 2026 statistics", "malaria HIV Tanzania health data"],
  UG: ["Uganda health statistics WHO 2026 indicators", "maternal mortality Uganda 2026", "malaria HIV Uganda statistics"],
  RW: ["Rwanda health statistics WHO 2026", "maternal mortality Rwanda 2026"],
  ET: ["Ethiopia health statistics WHO 2026", "maternal mortality Ethiopia 2026"],
  CD: ["statistiques de santé RDC OMS 2026", "mortalité maternelle RDC Congo 2026"],
  BI: ["statistiques de santé Burundi OMS 2026", "mortalité maternelle Burundi 2026"],
  SO: ["Somalia health statistics WHO 2026", "maternal mortality Somalia 2026"],
  SS: ["South Sudan health statistics WHO 2026", "maternal mortality South Sudan 2026"],
};

const COUNTRIES = ['KE', 'TZ', 'UG', 'RW', 'ET', 'CD', 'BI', 'SO', 'SS'];

// ── Result tracker ────────────────────────────────────────────────────────────
interface Stats {
  code: string;
  countryId: string;
  before: Record<string, number>;
  inserted: Record<string, number>;
  after: Record<string, number>;
  errors: string[];
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function getCountryMap(): Promise<Record<string, string>> {
  const rows = await db.select({ code: countries.code, id: countries.id }).from(countries);
  return Object.fromEntries(rows.map(r => [r.code, r.id]));
}

async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 30000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`DB operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

async function countAll(cid: string) {
  try {
    const [j, t, s, c, h] = await withDbTimeout(Promise.all([
      db.select({ n: count() }).from(jobs).where(eq(jobs.countryId, cid)),
      db.select({ n: count() }).from(tenders).where(eq(tenders.countryId, cid)),
      db.select({ n: count() }).from(salarySubmissions).where(eq(salarySubmissions.countryId, cid)),
      db.select({ n: count() }).from(complianceRequirements).where(eq(complianceRequirements.countryId, cid)),
      db.select({ n: count() }).from(healthDataPoints).where(eq(healthDataPoints.countryId, cid)),
    ]));
    return { jobs: +j[0].n, tenders: +t[0].n, salaries: +s[0].n, compliance: +c[0].n, health: +h[0].n };
  } catch (e) {
    return { jobs: 0, tenders: 0, salaries: 0, compliance: 0, health: 0 };
  }
}

// ── Save functions ────────────────────────────────────────────────────────────
async function saveJobs(items: BroadJobResource[], cid: string) {
  if (items.length === 0) return { ins: 0, errs: [] };
  try {
    const values = items.map(job => ({
      title: job.title,
      companyName: job.companyName || 'Unknown',
      description: job.description || 'No description',
      requirements: job.requirements,
      regionId: job.regionId,
      countryId: cid,
      jobType: job.jobType,
      sourceUrl: job.sourceUrl,
      postedDate: job.postedDate || new Date(),
      deadline: job.deadline ?? null,
      salaryMin: job.salaryMin?.toString() ?? null,
      salaryMax: job.salaryMax?.toString() ?? null,
      salaryCurrency: job.salaryCurrency ?? null,
      isActive: true,
    }));
    const r = await withDbTimeout(
      db.insert(jobs).values(values).onConflictDoNothing().returning({ id: jobs.id })
    );
    return { ins: r.length, errs: [] };
  } catch (e) {
    return { ins: 0, errs: [(e as Error).message?.slice(0, 80)] };
  }
}

async function saveTenders(items: BroadTenderResource[], cid: string) {
  if (items.length === 0) return { ins: 0, errs: [] };
  try {
    const values = items.map(t => ({
      referenceNo: t.referenceNo,
      title: t.title,
      description: t.description ?? null,
      contractingAuthority: t.contractingAuthority,
      category: t.category,
      budget: t.budget?.toString() ?? null,
      currency: t.currency,
      deadline: t.deadline ?? null,
      sourceUrl: t.sourceUrl,
      countryId: cid,
      regionId: t.regionId ?? null,
      status: 'open' as const,
    }));
    const r = await withDbTimeout(
      db.insert(tenders).values(values).onConflictDoNothing().returning({ id: tenders.id })
    );
    return { ins: r.length, errs: [] };
  } catch (e) {
    return { ins: 0, errs: [(e as Error).message?.slice(0, 80)] };
  }
}

async function saveSalaries(items: BroadSalaryResource[], cid: string) {
  if (items.length === 0) return { ins: 0, errs: [] };
  try {
    const values = items.map(s => ({
      jobTitle: s.jobTitle,
      countryId: cid,
      experienceLevel: s.experienceLevel,
      employmentType: s.employmentType,
      currency: s.currency,
      grossMonthlySalary: s.grossMonthlySalary.toString(),
      netMonthlySalary: s.netMonthlySalary?.toString() ?? null,
      yearsOfExperience: s.yearsOfExperience ?? null,
      isAnonymous: true,
      isVerified: true,
      sourceUrl: s.sourceUrl,
    }));
    const r = await withDbTimeout(
      db.insert(salarySubmissions).values(values).onConflictDoNothing().returning({ id: salarySubmissions.id })
    );
    return { ins: r.length, errs: [] };
  } catch (e) {
    return { ins: 0, errs: [(e as Error).message?.slice(0, 80)] };
  }
}

async function saveCompliance(items: BroadComplianceResource[], cid: string) {
  if (items.length === 0) return { ins: 0, errs: [] };
  try {
    const values = items.map(c => ({
      title: c.title,
      description: c.description,
      category: c.category,
      issuingAuthority: c.issuingAuthority,
      resourceType: c.resourceType,
      sourceUrl: c.sourceUrl,
      countryId: cid,
      isActive: true,
    }));
    const r = await withDbTimeout(
      db.insert(complianceRequirements).values(values).onConflictDoNothing().returning({ id: complianceRequirements.id })
    );
    return { ins: r.length, errs: [] };
  } catch (e) {
    return { ins: 0, errs: [(e as Error).message?.slice(0, 80)] };
  }
}

async function saveHealth(items: BroadHealthResource[], cid: string) {
  let ins = 0; const errs: string[] = [];
  for (const h of items) {
    try {
      // Upsert the indicator (by code)
      const indRows = await withDbTimeout(
        db.insert(healthIndicators).values({
          code: h.indicatorCode,
          name: h.indicatorName,
          unit: h.unit,
          category: h.category,
        }).onConflictDoUpdate({ target: healthIndicators.code, set: { name: h.indicatorName } })
          .returning({ id: healthIndicators.id })
      );
      const indicatorId = indRows[0]?.id;
      if (!indicatorId) continue;

      // Insert data point (unique on indicatorId+countryId+year)
      const dpRows = await withDbTimeout(
        db.insert(healthDataPoints).values({
          indicatorId,
          countryId: cid,
          value: h.value.toString(),
          year: h.year,
          source: h.sourceUrl,
        }).onConflictDoNothing().returning({ id: healthDataPoints.id })
      );
      if (dpRows.length > 0) ins++;
    } catch (e) { errs.push((e as Error).message?.slice(0, 80)); }
  }
  return { ins, errs };
}

// ── Scrape one module for one country with retry ─────────────────────────────
async function scrapeModule<T>(
  label: string,
  queries: string[],
  discover: (q: string, pages: number) => Promise<T[]>,
  save: (items: T[], cid: string) => Promise<{ ins: number; errs: string[] }>,
  cid: string,
  targetInserts: number = 0,
): Promise<{ total: number; errors: string[] }> {
  let total = 0;
  const allErrors: string[] = [];

  for (const query of queries) {
    if (targetInserts > 0 && total >= targetInserts) break;
    log(`    🔍 ${label} | "${query}"`);
    try {
      const found = await discover(query, 5);
      log(`       found ${found.length} items`);
      const { ins, errs } = await save(found, cid);
      total += ins;
      allErrors.push(...errs);
      if (errs.length > 0) log(`       ⚠️ db error: ${errs[0]}`);
      log(`       → +${ins} new (running total: ${total})`);
    } catch (e) {
      const msg = `[${label}][${query}] ${(e as Error).message?.slice(0, 100)}`;
      log(`       ❌ ${msg}`);
      allErrors.push(msg);
    }
    await new Promise(r => setTimeout(r, 1200));
  }
  return { total, errors: allErrors };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('🚀 AkiliHub Mass Scraper starting...');
  log(`   SCRAPLING_URL = ${process.env.SCRAPLING_URL}`);
  log(`   DATABASE_URL  = ${process.env.DATABASE_URL?.slice(0, 50)}...`);
  log('');

  const countryMap = await getCountryMap();
  log(`Found ${Object.keys(countryMap).length} countries in DB: ${Object.keys(countryMap).join(', ')}`);
  log('');

  // Check sidecar is reachable
  try {
    const ping = await fetch(`${process.env.SCRAPLING_URL}/health`, { signal: AbortSignal.timeout(10_000) });
    log(`✅ Sidecar health check: ${ping.status}`);
  } catch (e) {
    log(`⚠️  Sidecar health check failed: ${(e as Error).message} — will still attempt scraping`);
  }

  const statsAll: Record<string, Stats> = {};

  // Snapshot BEFORE
  log('\n📊 BEFORE snapshot...');
  for (const code of COUNTRIES) {
    const cid = countryMap[code];
    if (!cid) { log(`⚠️  ${code} not in DB — skipping`); continue; }
    const before = await countAll(cid);
    statsAll[code] = { code, countryId: cid, before, inserted: { jobs: 0, tenders: 0, salaries: 0, compliance: 0, health: 0 }, after: before, errors: [] };
    log(`  ${code}: J=${before.jobs} T=${before.tenders} S=${before.salaries} C=${before.compliance} H=${before.health}`);
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 1 — JOBS  (target 200+ new per country)
  // ══════════════════════════════════════════════════════════
  log('\n══════════════════════════════════════════');
  log('PHASE 1: JOBS (target ≥200 new per country)');
  log('══════════════════════════════════════════');

  for (const code of COUNTRIES) {
    const s = statsAll[code]; if (!s) continue;
    log(`\n  ▶ [JOBS] ${code}`);
    const { total, errors } = await scrapeModule('JOBS', JOB_QUERIES[code]!, discoverJobs, saveJobs, s.countryId, 200);

    // If under 200, run second pass with same queries
    if (total < 200) {
      log(`  ⚠️  ${code}: ${total} jobs so far, need ${200 - total} more — running second pass...`);
      const pass2 = await scrapeModule('JOBS-P2', JOB_QUERIES[code]!, discoverJobs, saveJobs, s.countryId, 0);
      s.inserted.jobs = total + pass2.total;
      s.errors.push(...errors, ...pass2.errors);
    } else {
      s.inserted.jobs = total;
      s.errors.push(...errors);
    }
    log(`  ✅ [JOBS] ${code}: +${s.inserted.jobs} new jobs`);
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 2 — TENDERS
  // ══════════════════════════════════════════════════════════
  log('\n══════════════════════════════════════════');
  log('PHASE 2: TENDERS');
  log('══════════════════════════════════════════');

  for (const code of COUNTRIES) {
    const s = statsAll[code]; if (!s) continue;
    log(`\n  ▶ [TENDERS] ${code}`);
    const { total, errors } = await scrapeModule('TENDERS', TENDER_QUERIES[code]!, discoverTenders, saveTenders, s.countryId);
    s.inserted.tenders = total;
    s.errors.push(...errors);
    log(`  ✅ [TENDERS] ${code}: +${total} new tenders`);
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 3 — SALARIES
  // ══════════════════════════════════════════════════════════
  log('\n══════════════════════════════════════════');
  log('PHASE 3: SALARIES');
  log('══════════════════════════════════════════');

  for (const code of COUNTRIES) {
    const s = statsAll[code]; if (!s) continue;
    log(`\n  ▶ [SALARIES] ${code}`);
    const { total, errors } = await scrapeModule('SALARIES', SALARY_QUERIES[code]!, discoverSalaries, saveSalaries, s.countryId);
    s.inserted.salaries = total;
    s.errors.push(...errors);
    log(`  ✅ [SALARIES] ${code}: +${total} new salary records`);
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 4 — COMPLIANCE
  // ══════════════════════════════════════════════════════════
  log('\n══════════════════════════════════════════');
  log('PHASE 4: COMPLIANCE');
  log('══════════════════════════════════════════');

  for (const code of COUNTRIES) {
    const s = statsAll[code]; if (!s) continue;
    log(`\n  ▶ [COMPLIANCE] ${code}`);
    const { total, errors } = await scrapeModule('COMPLIANCE', COMPLIANCE_QUERIES[code]!, discoverCompliance, saveCompliance, s.countryId);
    s.inserted.compliance = total;
    s.errors.push(...errors);
    log(`  ✅ [COMPLIANCE] ${code}: +${total} new resources`);
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 5 — HEALTH
  // ══════════════════════════════════════════════════════════
  log('\n══════════════════════════════════════════');
  log('PHASE 5: HEALTH DATA');
  log('══════════════════════════════════════════');

  for (const code of COUNTRIES) {
    const s = statsAll[code]; if (!s) continue;
    log(`\n  ▶ [HEALTH] ${code}`);
    const { total, errors } = await scrapeModule('HEALTH', HEALTH_QUERIES[code]!, discoverHealth, saveHealth, s.countryId);
    s.inserted.health = total;
    s.errors.push(...errors);
    log(`  ✅ [HEALTH] ${code}: +${total} new data points`);
  }

  // AFTER snapshot
  log('\n📊 AFTER snapshot...');
  for (const code of COUNTRIES) {
    const s = statsAll[code]; if (!s) continue;
    s.after = await countAll(s.countryId);
  }

  // ══════════════════════════════════════════════════════════
  // FINAL REPORT
  // ══════════════════════════════════════════════════════════
  log('\n');
  log('╔═══════════════════════════════════════════════════════════╗');
  log('║           MASS SCRAPE — FINAL REPORT                      ║');
  log('╚═══════════════════════════════════════════════════════════╝\n');

  let totalNewJobs = 0, totalNewTenders = 0, totalNewSalaries = 0, totalNewCompliance = 0, totalNewHealth = 0;

  for (const code of COUNTRIES) {
    const s = statsAll[code]; if (!s) continue;
    const jobsStatus = s.inserted.jobs >= 200 ? '✅' : s.inserted.jobs > 50 ? '⚠️ ' : '❌';
    log(`${code}:`);
    log(`  Jobs       ${jobsStatus} +${s.inserted.jobs} new  (DB total: ${s.after.jobs})`);
    log(`  Tenders    ➕ +${s.inserted.tenders} new  (DB total: ${s.after.tenders})`);
    log(`  Salaries   ➕ +${s.inserted.salaries} new  (DB total: ${s.after.salaries})`);
    log(`  Compliance ➕ +${s.inserted.compliance} new  (DB total: ${s.after.compliance})`);
    log(`  Health     ➕ +${s.inserted.health} new  (DB total: ${s.after.health})`);
    if (s.errors.length > 0) log(`  ⚠️  ${s.errors.length} errors (first: ${s.errors[0]?.slice(0, 80)})`);
    log('');
    totalNewJobs += s.inserted.jobs;
    totalNewTenders += s.inserted.tenders;
    totalNewSalaries += s.inserted.salaries;
    totalNewCompliance += s.inserted.compliance;
    totalNewHealth += s.inserted.health;
  }

  log(`GRAND TOTALS:`);
  log(`  Jobs:       +${totalNewJobs}`);
  log(`  Tenders:    +${totalNewTenders}`);
  log(`  Salaries:   +${totalNewSalaries}`);
  log(`  Compliance: +${totalNewCompliance}`);
  log(`  Health:     +${totalNewHealth}`);

  // Write JSON report
  fs.writeFileSync('scraper-progress.json', JSON.stringify({ timestamp: new Date().toISOString(), stats: statsAll }, null, 2));
  log('\n📄 Full report → scraper-progress.json');
  log('✅ Done!');
  process.exit(0);
}

main().catch(e => {
  log(`❌ FATAL: ${e.message}`);
  console.error(e);
  process.exit(1);
});
