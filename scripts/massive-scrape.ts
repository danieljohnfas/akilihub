import { searchGoogle } from '@/lib/scrapers/broad-search-engine';
import { extractJobsWithAI } from '@/lib/scrapers/broad-search-engine';
import { extractTendersWithAI } from '@/lib/scrapers/broad-search-engine-tenders';
import { extractComplianceWithAI } from '@/lib/scrapers/broad-search-engine-compliance';
import { extractHealthWithAI } from '@/lib/scrapers/broad-search-engine-health';
import { extractSalariesWithAI } from '@/lib/scrapers/broad-search-engine-salaries';

import { saveJobs } from '@/inngest/scrape-jobs';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { healthDataPoints, healthIndicators } from '@/lib/db/schema/health';
import { salarySubmissions, employers } from '@/lib/db/schema/salaries';
import { sql } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from '@/lib/scrapers/compliance-base';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getCountryId(code: string): Promise<string> {
    const res = await db.execute(sql`SELECT id FROM countries WHERE code = ${code} LIMIT 1`);
    return (res as any)[0]?.id as string;
}

/**
 * Infer the ISO country code from a URL's TLD / subdomain / known domain.
 * Falls back to 'KE' if unknown.
 */
function inferCountryFromUrl(url: string): string {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (hostname.includes('.ug') || hostname.includes('uganda'))  return 'UG';
        if (hostname.includes('.tz') || hostname.includes('tanzania')) return 'TZ';
        if (hostname.includes('.rw') || hostname.includes('rwanda'))  return 'RW';
        if (hostname.includes('.et') || hostname.includes('ethiopia')) return 'ET';
        if (hostname.includes('.cd') || hostname.includes('congo'))  return 'CD';
        if (hostname.includes('.ke') || hostname.includes('kenya'))  return 'KE';
    } catch { /* ignore invalid URLs */ }
    return 'KE'; // fallback
}

/**
 * Normalize job board URLs that have employer-facing vs jobseeker-facing paths.
 * e.g. greatugandajobs.com/employers/job-detail/ → /jobs/job-detail/
 */
function normalizeApplyUrl(url: string): string {
    return url.replace(/\/employers\/job-detail\//gi, '/jobs/job-detail/');
}

async function getCategoryId(_name: string): Promise<string | undefined> {
    const res = await db.execute(sql`SELECT id FROM job_categories LIMIT 1`);
    return (res as any)[0]?.id as string | undefined;
}

// ── Queries ───────────────────────────────────────────────────────────────────
// Queries are intentionally domain-targeted for Tenders/Compliance/Health
// to land on government portals + document-heavy pages rather than news.
const QUERIES = {
    jobs: [
        'latest jobs in Kenya 2026', 'software engineer jobs Tanzania',
        'NGO jobs Uganda', 'remote jobs Rwanda', 'finance jobs Ethiopia',
        'oil and gas jobs DRC', 'teaching jobs Kenya', 'marketing jobs Uganda',
        'healthcare jobs Nairobi', 'engineering jobs East Africa',
    ],
    tenders: [
        // Targeted government procurement portals — return PDFs & structured notices
        'site:ppra.go.ke tender notice 2026',
        'site:ppra.go.tz open tender 2026',
        'site:ppda.go.ug procurement notice',
        'site:rppa.gov.rw appel offres 2026',
        'site:mercure.gouv.cd tender',
        'site:ethiopiaprocurement.gov.et bid',
        // Filetype-targeted searches return PDF tender documents directly
        'government tender Kenya 2026 filetype:pdf',
        'procurement notice Tanzania filetype:pdf',
        'bid documents Uganda 2026 filetype:pdf',
        'tender announcement Rwanda filetype:pdf',
        'open tender Africa 2026 procurement authority',
        'invitation to tender East Africa construction works 2026',
    ],
    compliance: [
        // Revenue authorities and registrar portals
        'site:kra.go.ke tax filing guide',
        'site:tra.go.tz business registration',
        'site:ura.go.ug tax compliance forms',
        'site:rra.gov.rw business license',
        'site:erca.gov.et tax requirements',
        // Filetype searches for official compliance documents
        'business registration requirements Kenya filetype:pdf',
        'tax compliance certificate Tanzania 2026 filetype:pdf',
        'employment law Uganda 2026 filetype:pdf',
        'PAYE guide East Africa filetype:pdf',
        'data protection compliance Africa 2026',
        'environmental compliance requirements Kenya 2026',
    ],
    health: [
        // WHO, Ministry of Health, and DHIS2 portals
        'site:who.int/countries/ken health statistics 2024',
        'site:who.int/countries/tza health data',
        'site:health.go.ke health bulletin filetype:pdf',
        'site:moh.go.tz health report filetype:pdf',
        'site:health.go.ug health indicators filetype:pdf',
        // Targeted statistical reports
        'Kenya health statistics 2024 filetype:pdf',
        'malaria prevalence East Africa 2024 report filetype:pdf',
        'maternal mortality Africa 2024 statistics filetype:pdf',
        'HIV prevalence sub-Saharan Africa 2024 filetype:pdf',
        '"health indicators" "2024" Kenya OR Tanzania OR Uganda filetype:pdf',
        'DHIS2 health data Africa 2024',
    ],
    salaries: [
        'software engineer salary Kenya 2026', 'doctor salary Tanzania',
        'teacher salary Uganda', 'accountant salary Rwanda',
        'nurse salary Ethiopia', 'engineer salary DRC',
        'NGO salary scale Kenya 2026', 'civil servant salary Tanzania',
        'bank salary Uganda', 'consultant salary East Africa',
    ],
};

// ── URL deduplication ─────────────────────────────────────────────────────────
async function getExistingUrls(table: any): Promise<Set<string>> {
    try {
        const rows = await db.select({ url: table.sourceUrl }).from(table);
        return new Set(rows.map((r: any) => r.url).filter(Boolean));
    } catch {
        return new Set();
    }
}

// ── Core scrape module ────────────────────────────────────────────────────────
/**
 * extractFn now receives (text, url, pdfLinks) so all modules can enrich
 * themselves with PDF/DOCX content found on the page.
 */
async function scrapeModule(
    moduleName: string,
    queries: string[],
    table: any,
    extractFn: (text: string, url: string, pdfLinks: string[]) => Promise<any[]>,
    saveFn: (data: any[], countryId: string) => Promise<void>,
) {
    console.log(`\n\n--- Starting Module: ${moduleName.toUpperCase()} ---`);
    const existingUrls = await getExistingUrls(table);
    const targetUrls = new Set<string>();

    // 1. DISCOVERY — collect 300 new URLs
    console.log(`Discovering up to 300 new URLs for ${moduleName}...`);
    for (const q of queries) {
        if (targetUrls.size >= 300) break;
        const urls = await searchGoogle(q, 50);
        for (const u of urls) {
            if (!existingUrls.has(u) && !targetUrls.has(u)) {
                targetUrls.add(u);
                if (targetUrls.size >= 300) break;
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`Found ${targetUrls.size} new URLs for ${moduleName}. Beginning extraction...`);

    // 2. EXTRACTION & SAVING
    let successCount = 0;
    const countryId = await getCountryId('KE'); // Default to KE when unknown

    const urlArray = Array.from(targetUrls);
    for (let i = 0; i < urlArray.length; i += 5) {
        const batch = urlArray.slice(i, i + 5);
        await Promise.all(batch.map(async (url) => {
            try {
                const html = await fetchHtml(url);
                if (!html) return;
                // Pass pdfLinks through to extractFn so modules can enrich themselves
                const { text, pdfLinks } = await htmlToTextEnriched(html, url);
                // Infer country from the URL domain — avoids blanket KE default
                const inferredCode = inferCountryFromUrl(url);
                const inferredCountryId = await getCountryId(inferredCode);
                const extracted = await extractFn(text, url, pdfLinks);
                if (extracted && extracted.length > 0) {
                    await saveFn(extracted, inferredCountryId || countryId);
                    successCount += extracted.length;
                }
            } catch {
                // Ignore silent failures on massive scrape
            }
        }));
        console.log(`[${moduleName}] Processed ${Math.min(i + 5, urlArray.length)} / ${urlArray.length} ... inserted ${successCount} so far.`);
        await new Promise(r => setTimeout(r, 2000)); // Polite pacing
    }

    console.log(`--- Finished Module: ${moduleName.toUpperCase()}. Total Inserted: ${successCount} ---`);
    return successCount;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('Starting Massive Scrape for 1500 Sites...');

    const results: Record<string, number> = {};

    // ── Jobs ──────────────────────────────────────────────────────────────────
    results.jobs = await scrapeModule(
        'jobs', QUERIES.jobs, jobs,
        (text, url, _pdfLinks) => extractJobsWithAI(text, url),
        async (data, cid) => {
            for (const job of data) {
                // Normalize any employer-path URLs (e.g. greatugandajobs.com/employers/ → /jobs/)
                const cleanUrl = normalizeApplyUrl(job.sourceUrl || '');
                const inferredCode = inferCountryFromUrl(cleanUrl);
                const resolvedCountryId = (await getCountryId(inferredCode)) || cid;
                await db.insert(jobs).values({
                    title: job.title,
                    companyName: job.companyName,
                    description: job.description,
                    requirements: job.requirements,
                    regionId: job.regionId || null,
                    countryId: resolvedCountryId,
                    jobType: job.jobType,
                    sourceUrl: cleanUrl,
                    postedDate: job.postedDate || new Date(),
                    deadline: job.deadline ?? null,
                    isActive: true,
                }).onConflictDoNothing();
            }
        },
    );

    // ── Tenders ───────────────────────────────────────────────────────────────
    results.tenders = await scrapeModule(
        'tenders', QUERIES.tenders, tenders,
        // Pass pdfLinks — extractTendersWithAI already appends doc content to text
        (text, url, pdfLinks) => extractTendersWithAI(text, url, pdfLinks),
        async (data, cid) => {
            for (const t of data) {
                await db.insert(tenders).values({
                    referenceNo: t.referenceNo || `BROAD-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    title: t.title,
                    description: t.description,
                    contractingAuthority: t.contractingAuthority || 'Unknown Authority',
                    countryId: cid,
                    regionId: t.regionId || null,
                    category: t.category || 'services',
                    sourceUrl: t.sourceUrl,
                    publishedAt: new Date(),
                    deadline: t.deadline || null,
                    budget: t.budget ? String(t.budget) : null,
                    currency: t.currency || 'USD',
                }).onConflictDoNothing();
            }
        },
    );

    // ── Compliance ────────────────────────────────────────────────────────────
    results.compliance = await scrapeModule(
        'compliance', QUERIES.compliance, complianceRequirements,
        // Pass pdfLinks — extractComplianceWithAI enriches with PDF text
        (text, url, pdfLinks) => extractComplianceWithAI(text, url, pdfLinks),
        async (data, cid) => {
            for (const c of data) {
                await db.insert(complianceRequirements).values({
                    title: c.title,
                    description: c.description,
                    countryId: cid,
                    sourceUrl: c.sourceUrl,
                    category: c.category,
                    issuingAuthority: c.issuingAuthority || 'Various',
                    resourceType: c.resourceType || 'guideline',
                    lastVerifiedAt: new Date(),
                }).onConflictDoNothing();
            }
        },
    );

    // ── Health ────────────────────────────────────────────────────────────────
    results.health = await scrapeModule(
        'health', QUERIES.health, healthDataPoints,
        // Pass pdfLinks — extractHealthWithAI enriches with PDF/DOCX report text
        (text, url, pdfLinks) => extractHealthWithAI(text, url, pdfLinks),
        async (data, cid) => {
            for (const h of data) {
                // Upsert the indicator first (or get existing)
                const indRes = await db.insert(healthIndicators).values({
                    code: h.indicatorCode || `GENERIC-${Math.random().toString(36).substring(7)}`,
                    name: h.indicatorName || 'Unknown Indicator',
                }).onConflictDoUpdate({
                    target: healthIndicators.code,
                    set: { name: h.indicatorName || 'Unknown Indicator' },
                }).returning({ id: healthIndicators.id });

                if (indRes.length === 0) continue;

                await db.insert(healthDataPoints).values({
                    indicatorId: indRes[0].id,
                    countryId: cid,
                    value: String(h.value),
                    year: h.year || new Date().getFullYear(),
                    source: h.sourceUrl,
                }).onConflictDoNothing();
            }
        },
    );

    // ── Salaries ──────────────────────────────────────────────────────────────
    results.salaries = await scrapeModule(
        'salaries', QUERIES.salaries, salarySubmissions,
        (text, url, _pdfLinks) => extractSalariesWithAI(text, url),
        async (data, cid) => {
            const catId = await getCategoryId('General');
            for (const s of data) {
                const empRes = await db.insert(employers).values({
                    name: s.employerName || 'Unknown Employer',
                    countryId: cid,
                }).onConflictDoUpdate({
                    target: [employers.name, employers.countryId],
                    set: { name: s.employerName || 'Unknown Employer' },
                }).returning({ id: employers.id });

                if (empRes.length === 0) continue;

                await db.insert(salarySubmissions).values({
                    jobTitle: s.jobTitle,
                    employerId: empRes[0].id,
                    countryId: cid,
                    jobCategoryId: catId,
                    grossMonthlySalary: String(s.grossMonthlySalary),
                    currency: s.currency || 'USD',
                    employmentType: s.employmentType || 'full_time',
                    experienceLevel: s.experienceLevel || 'mid',
                    submittedAt: new Date(),
                    sourceUrl: s.sourceUrl, // Captured from AI extraction
                }).onConflictDoNothing();
            }
        },
    );

    // ── Final Report ──────────────────────────────────────────────────────────
    console.log('\n\n=========================================');
    console.log('FINAL REPORT');
    console.log('=========================================');
    console.log('Jobs Added:       ', results.jobs);
    console.log('Tenders Added:    ', results.tenders);
    console.log('Compliance Added: ', results.compliance);
    console.log('Health Added:     ', results.health);
    console.log('Salaries Added:   ', results.salaries);
    console.log('=========================================');

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
