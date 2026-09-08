import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); // Load API keys
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
// ── Dynamic Query Generation ────────────────────────────────────────────────
const COUNTRIES = ['Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'DRC', 'Burundi', 'Somalia', 'South Sudan'];
const PROFESSIONS = ['software engineer', 'doctor', 'nurse', 'teacher', 'accountant', 'manager', 'driver', 'plumber', 'electrician', 'lawyer', 'pharmacist', 'social worker', 'sales', 'marketing'];
const DOMAINS_TENDERS = ['site:ppra.go.ke', 'site:ppra.go.tz', 'site:ppda.go.ug', 'site:rppa.gov.rw', 'site:ethiopiaprocurement.gov.et'];
const DOMAINS_COMPLIANCE = ['site:kra.go.ke', 'site:tra.go.tz', 'site:ura.go.ug', 'site:rra.gov.rw', 'site:erca.gov.et'];
const DOMAINS_HEALTH = ['site:who.int', 'site:health.go.ke', 'site:moh.go.tz', 'site:health.go.ug', 'site:unicef.org'];

const QUERIES = {
    jobs: COUNTRIES.flatMap(c => PROFESSIONS.flatMap(p => [
        `${p} jobs ${c} 2026`, `${p} vacancies ${c}`, `latest ${p} careers ${c}`
    ])),
    tenders: COUNTRIES.flatMap(c => [
        `open tender ${c} 2026`, `procurement notice ${c} filetype:pdf`, `bid documents ${c} filetype:pdf`
    ]).concat(DOMAINS_TENDERS.flatMap(d => [`${d} tender notice 2026`, `${d} open tender`, `${d} procurement`])),
    compliance: COUNTRIES.flatMap(c => [
        `business registration requirements ${c} filetype:pdf`, `tax compliance certificate ${c} filetype:pdf`, `employment law ${c} filetype:pdf`, `environmental compliance ${c} filetype:pdf`
    ]).concat(DOMAINS_COMPLIANCE.flatMap(d => [`${d} tax filing guide`, `${d} business registration`, `${d} compliance forms`])),
    health: COUNTRIES.flatMap(c => [
        `${c} health statistics 2024 filetype:pdf`, `malaria prevalence ${c} report filetype:pdf`, `maternal mortality ${c} statistics filetype:pdf`, `HIV prevalence ${c} filetype:pdf`, `DHIS2 health data ${c}`
    ]).concat(DOMAINS_HEALTH.flatMap(d => [`${d} health statistics`, `${d} health data`, `${d} health report filetype:pdf`])),
    salaries: COUNTRIES.flatMap(c => PROFESSIONS.flatMap(p => [
        `${p} salary ${c} 2026`, `${p} pay scale ${c}`, `average ${p} salary ${c}`
    ]))
};

// Shuffle all queries
for (const k of Object.keys(QUERIES)) {
    (QUERIES as any)[k].sort(() => Math.random() - 0.5);
}

// ── URL deduplication ─────────────────────────────────────────────────────────
async function getExistingUrls(table: any): Promise<Set<string>> {
    try {
        console.log(`[DEBUG] Fetching existing URLs for ${table._.name}...`);
        const rows = await db.select({ url: table.sourceUrl }).from(table);
        console.log(`[DEBUG] Fetched ${rows.length} existing URLs.`);
        return new Set(rows.map((r: any) => r.url).filter(Boolean));
    } catch (e) {
        console.error(`[DEBUG] Error fetching existing URLs:`, e);
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

    // 1. DISCOVERY — collect 35000 new URLs
    console.log(`Discovering up to 35000 new URLs for ${moduleName}...`);
    for (const q of queries) {
        if (targetUrls.size >= 35000) break;
        const urls = await searchGoogle(q, 50);
        let added = 0;
        for (const u of urls) {
            if (!existingUrls.has(u) && !targetUrls.has(u)) {
                targetUrls.add(u);
                added++;
                if (targetUrls.size >= 35000) break;
            }
        }
        if (added > 0) {
            console.log(`[DEBUG] Query "${q}" yielded ${added} new URLs. Total targetUrls: ${targetUrls.size}`);
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
