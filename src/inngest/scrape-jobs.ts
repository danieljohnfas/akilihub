import { inngest } from "./client";
import { discoverJobs, BroadJobResource } from "@/lib/scrapers/broad-search-engine";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";
import { classifySourceUrl } from "@/lib/sources/employer-resolver";

// ── Thresholds ────────────────────────────────────────────────────────────────
const JOB_TARGET = 200; // Minimum new inserts before we skip second pass

// ── Country lookup ────────────────────────────────────────────────────────────
async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

// ── Batch-insert save (fast path) ─────────────────────────────────────────────
// Uses batch insert for efficiency (from mass-scrape learnings), falls back
// to per-item insert on conflict-key violations.
export async function saveJobs(discovered: BroadJobResource[], countryCode: string): Promise<number> {
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;

  if (discovered.length === 0) return 0;

  // Attempt batch insert first (10-30x faster than one-by-one)
  try {
    const values = discovered.map(job => {
      const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(job.sourceUrl);
      return {
        title: job.title,
        companyName: job.companyName || 'Unknown',
        description: job.description || 'No description',
        requirements: job.requirements,
        regionId: job.regionId,
        countryId,
        jobType: job.jobType,
        sourceUrl: job.sourceUrl,
        employerUrl: quickEmployerUrl,          // null for aggregators (resolved by backfill job)
        isAggregatorSource,
        postedDate: job.postedDate || new Date(),
        deadline: job.deadline ?? null,
        salaryMin: job.salaryMin?.toString() ?? null,
        salaryMax: job.salaryMax?.toString() ?? null,
        salaryCurrency: job.salaryCurrency ?? null,
        isActive: true,
      };
    });
    const rows = await db.insert(jobs).values(values).onConflictDoNothing().returning({ id: jobs.id });
    return rows.length;
  } catch {
    // Batch failed (e.g. unique constraint on one item): fall back to per-item
    let inserted = 0;
    for (const job of discovered) {
      try {
        const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(job.sourceUrl);
        const rows = await db.insert(jobs).values({
          title: job.title,
          companyName: job.companyName || 'Unknown',
          description: job.description || 'No description',
          requirements: job.requirements,
          regionId: job.regionId,
          countryId,
          jobType: job.jobType,
          sourceUrl: job.sourceUrl,
          employerUrl: quickEmployerUrl,
          isAggregatorSource,
          postedDate: job.postedDate || new Date(),
          deadline: job.deadline ?? null,
          salaryMin: job.salaryMin?.toString() ?? null,
          salaryMax: job.salaryMax?.toString() ?? null,
          salaryCurrency: job.salaryCurrency ?? null,
          isActive: true,
        }).onConflictDoNothing().returning({ id: jobs.id });
        if (rows.length > 0) inserted++;
      } catch (e) {
        console.error(`[scrape-jobs] Failed to insert job: ${job.title}`, e);
      }
    }
    return inserted;
  }
}

// ── Run all queries for a country, returns total inserted ─────────────────────
async function runQueriesForCountry(queries: string[], countryCode: string, label: string): Promise<number> {
  let total = 0;
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    try {
      const discovered = await discoverJobs(query, 5);
      const inserted = await saveJobs(discovered, countryCode);
      total += inserted;
      console.log(`[${label}] q${i}: "${query}" → +${inserted} (running: ${total})`);
    } catch (e) {
      console.error(`[${label}] q${i} failed: ${(e as Error).message}`);
    }
  }
  return total;
}

// ── Job factory with retry logic ──────────────────────────────────────────────
function makeJobScraper(
  id: string,
  name: string,
  cron: string,
  queries: string[],
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      // Pass 1 — run all queries
      const pass1 = await step.run(`execute-job-scraper-pass1`, async () => {
        return await runQueriesForCountry(queries, countryCode, `${id}-p1`);
      });

      let totalInserted = pass1;

      // Pass 2 — only if we fell short of the target (retry on under-performance)
      if (pass1 < JOB_TARGET) {
        console.log(`[${id}] Pass 1 yielded ${pass1} — under target ${JOB_TARGET}. Running second pass...`);
        const pass2 = await step.run(`execute-job-scraper-pass2`, async () => {
          return await runQueriesForCountry(queries, countryCode, `${id}-p2`);
        });
        totalInserted += pass2;
        console.log(`[${id}] Pass 2 added ${pass2}. Grand total: ${totalInserted}`);
      }

      return {
        message: `Scraped and inserted ${totalInserted} jobs for ${name}.`,
        totalInserted,
        hitTarget: totalInserted >= JOB_TARGET,
      };
    }
  );
}

// ── Kenya (KE) — English, sector-specific + site-targeted ──────────────────────
export const scrapeJobsKenyaJob = makeJobScraper(
  "scrape-jobs-kenya", "🇰🇪 Jobs Kenya", "30 4 * * *",
  [
    "jobs hiring Nairobi Kenya 2026",
    "latest job vacancies Kenya NGO 2026",
    "remote software engineering jobs Kenya 2026",
    "health medical nursing jobs Kenya 2026",
    "finance accounting jobs Nairobi Kenya 2026",
    "engineering construction jobs Kenya 2026",
    "site:reliefweb.int jobs Kenya",
    "site:ngojobsinafrica.com Kenya",
    "site:ke.linkedin.com/jobs Kenya 2026",
    "UN UNICEF WHO jobs Kenya 2026",
    "government jobs Kenya PSC 2026",
    "teaching education lecturer jobs Kenya 2026",
    "humanitarian jobs Kenya 2026",           // ← from mass-scrape
  ],
  "KE"
);

// ── Tanzania (TZ) — English + Swahili (ajira) ────────────────────────────────
export const scrapeJobsTanzaniaJob = makeJobScraper(
  "scrape-jobs-tanzania", "🇹🇿 Jobs Tanzania", "0 5 * * *",
  [
    "ajira mpya Tanzania Dar es Salaam 2026",
    "jobs vacancies Tanzania 2026",
    "nafasi za kazi Tanzania 2026",
    "NGO jobs Tanzania 2026",
    "site:reliefweb.int jobs Tanzania",
    "site:ngojobsinafrica.com Tanzania",
    "IT software developer jobs Dar es Salaam 2026",
    "health medical jobs Tanzania 2026",
    "finance accounting ajira Tanzania 2026",
    "UN WFP UNICEF jobs Tanzania 2026",
  ],
  "TZ"
);

// ── Uganda (UG) — English, sector-specific ────────────────────────────────────
export const scrapeJobsUgandaJob = makeJobScraper(
  "scrape-jobs-uganda", "🇺🇬 Jobs Uganda", "30 5 * * *",
  [
    "jobs vacancies Uganda Kampala 2026",
    "entry level graduate jobs Uganda 2026",
    "finance accounting jobs Uganda 2026",
    "NGO development jobs Uganda 2026",
    "site:reliefweb.int jobs Uganda",
    "site:ngojobsinafrica.com Uganda",
    "health medical jobs Uganda 2026",
    "IT technology jobs Kampala Uganda 2026",
    "UN UNICEF WHO jobs Uganda 2026",
    "engineering construction jobs Uganda 2026",
  ],
  "UG"
);

// ── Rwanda (RW) — English + Kinyarwanda context ───────────────────────────────
export const scrapeJobsRwandaJob = makeJobScraper(
  "scrape-jobs-rwanda", "🇷🇼 Jobs Rwanda", "0 6 * * *",
  [
    "jobs vacancies Rwanda Kigali 2026",
    "IT technology software jobs Rwanda 2026",
    "international organization NGO jobs Rwanda 2026",
    "site:reliefweb.int jobs Rwanda",
    "site:ngojobsinafrica.com Rwanda",
    "finance banking jobs Rwanda 2026",
    "health medical jobs Rwanda 2026",
    "UN WFP UNHCR jobs Rwanda 2026",
    "engineering infrastructure jobs Rwanda 2026",
    "government public sector jobs Rwanda 2026",  // ← from mass-scrape
  ],
  "RW"
);

// ── Ethiopia (ET) — English + Amharic representation ─────────────────────────
export const scrapeJobsEthiopiaJob = makeJobScraper(
  "scrape-jobs-ethiopia", "🇪🇹 Jobs Ethiopia", "30 6 * * *",
  [
    "jobs vacancies Ethiopia Addis Ababa 2026",
    "NGO jobs Ethiopia 2026",
    "humanitarian jobs Ethiopia UNHCR 2026",
    "site:reliefweb.int jobs Ethiopia",
    "site:ngojobsinafrica.com Ethiopia",
    "health medical jobs Ethiopia WHO 2026",
    "engineering logistics jobs Ethiopia 2026",
    "finance accounting jobs Addis Ababa 2026",
    "UN WFP UNICEF jobs Ethiopia 2026",
    "teaching education jobs Ethiopia 2026",
    "ስራ Ethiopia 2026",
  ],
  "ET"
);

// ── DRC / Congo (CD) — French primary + English ──────────────────────────────
export const scrapeJobsDRCJob = makeJobScraper(
  "scrape-jobs-drc", "🇨🇩 Jobs DRC", "0 7 * * *",
  [
    "offres emploi RDC Kinshasa 2026",
    "recrutement ONG RDC Congo 2026",
    "emplois mines extractives Congo Katanga 2026",
    "offres emploi santé médecin RDC 2026",
    "recrutement entreprises Kinshasa Lubumbashi 2026",
    "ingénieur civil génie civil RDC 2026",
    "offres emploi secteur financier banque RDC 2026",
    "site:reliefweb.int emploi RDC Congo",
    "site:ngojobsinafrica.com DRC Congo",
    "UN UNICEF ONU recrutement RDC 2026",
    "jobs in DRC Congo English 2026",
  ],
  "CD"
);

// ── Burundi (BI) — French primary + Kirundi context ──────────────────────────
export const scrapeJobsBurundiJob = makeJobScraper(
  "scrape-jobs-burundi", "🇧🇮 Jobs Burundi", "30 7 * * *",
  [
    "offres emploi Bujumbura Burundi 2026",
    "recrutement ONG Burundi 2026",
    "emplois fonctionnaire gouvernement Burundi 2026",
    "site:reliefweb.int emploi Burundi",
    "site:ngojobsinafrica.com Burundi",
    "UN UNICEF UNHCR recrutement Burundi 2026",
    "santé médecin emploi Burundi 2026",
    "NGO jobs Burundi humanitarian 2026",
    "emplois finances comptabilité Burundi 2026",
    "jobs vacancies Burundi English 2026",   // ← from mass-scrape
  ],
  "BI"
);

// ── Somalia (SO) — Somali + English + Arabic ──────────────────────────────────
export const scrapeJobsSomaliaJob = makeJobScraper(
  "scrape-jobs-somalia", "🇸🇴 Jobs Somalia", "0 8 * * *",
  [
    "site:reliefweb.int jobs Somalia",
    "NGO jobs Mogadishu Somalia 2026",
    "humanitarian jobs Somalia 2026",
    "UN UNICEF UNHCR jobs Somalia 2026",
    "shaqo Mogadishu Somalia 2026",
    "وظائف الصومال مقديشو 2026",
    "jobs vacancies Hargeisa Somaliland 2026",
    "health medical jobs Somalia WHO 2026",
    "site:ngojobsinafrica.com Somalia",
    "AMISOM peacekeeping jobs Somalia 2026",
    "international NGO Somalia Mogadishu hiring 2026",  // ← from mass-scrape
  ],
  "SO"
);

// ── South Sudan (SS) — English + humanitarian focus ───────────────────────────
export const scrapeJobsSouthSudanJob = makeJobScraper(
  "scrape-jobs-south-sudan", "🇸🇸 Jobs South Sudan", "30 8 * * *",
  [
    "site:reliefweb.int jobs South Sudan",
    "NGO jobs Juba South Sudan 2026",
    "humanitarian jobs South Sudan 2026",
    "UN UNMISS UNICEF jobs South Sudan 2026",
    "OCHA WFP jobs South Sudan 2026",
    "health medical jobs South Sudan 2026",
    "jobs vacancies Juba 2026",
    "site:ngojobsinafrica.com South Sudan",
    "MSF IRC jobs South Sudan 2026",
    "South Sudan international organization jobs 2026",  // ← from mass-scrape
  ],
  "SS"
);
