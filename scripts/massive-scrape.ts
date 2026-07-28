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
import { healthDataPoints } from '@/lib/db/schema/health';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { eq, sql } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from '@/lib/scrapers/compliance-base';
import { BroadTenderResource } from '@/lib/scrapers/broad-search-engine-tenders';

// Simple polyfills for save functions for other modules since they might not be easily exported
async function getCountryId(code: string) {
    const res = await db.execute(sql`SELECT id FROM countries WHERE code = ${code} LIMIT 1`);
    return (res as any)[0]?.id as string;
}
async function getCategoryId(name: string) {
    const res = await db.execute(sql`SELECT id FROM job_categories LIMIT 1`);
    return (res as any)[0]?.id as string;
}

const QUERIES = {
    jobs: ["latest jobs in Kenya 2026", "software engineer jobs Tanzania", "NGO jobs Uganda", "remote jobs Rwanda", "finance jobs Ethiopia", "oil and gas jobs DRC", "teaching jobs Kenya", "marketing jobs Uganda"],
    tenders: ["government tenders Kenya 2026", "open tenders Tanzania", "PPDA Uganda procurement", "Rwanda public procurement", "Ethiopia government contracts", "DRC mining tenders"],
    compliance: ["business registration compliance Kenya", "tax requirements Tanzania 2026", "labor laws Uganda", "data protection act Rwanda", "Ethiopia investment regulations", "DRC environmental compliance"],
    health: ["malaria statistics Kenya", "maternal mortality Tanzania", "HIV prevalence Uganda", "cholera outbreak Rwanda", "Ethiopia health indicators", "DRC ebola cases 2026"],
    salaries: ["software engineer salary Kenya", "doctor salary Tanzania", "teacher salary Uganda", "accountant salary Rwanda", "nurse salary Ethiopia", "engineer salary DRC"]
};

async function getExistingUrls(table: any): Promise<Set<string>> {
    try {
        const rows = await db.select({ url: table.sourceUrl }).from(table);
        return new Set(rows.map(r => r.url).filter(Boolean));
    } catch {
        return new Set(); // Salary doesn't have sourceUrl in DB directly, or handled differently
    }
}

async function scrapeModule(
    moduleName: string, 
    queries: string[], 
    table: any, 
    extractFn: (text: string, url: string) => Promise<any[]>,
    saveFn: (data: any[], countryId: string) => Promise<void>
) {
    console.log(`\n\n--- Starting Module: ${moduleName.toUpperCase()} ---`);
    const existingUrls = await getExistingUrls(table);
    const targetUrls = new Set<string>();

    // 1. DISCOVERY
    console.log(`Discovering 300 new URLs for ${moduleName}...`);
    for (const q of queries) {
        if (targetUrls.size >= 300) break;
        const urls = await searchGoogle(q, 50); // Get 50 per query
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
    const countryId = await getCountryId('KE'); // Default to KE for mass scrape if unknown
    
    // Process in batches of 5 to avoid complete rate limit but keep it somewhat fast
    const urlArray = Array.from(targetUrls);
    for (let i = 0; i < urlArray.length; i += 5) {
        const batch = urlArray.slice(i, i + 5);
        await Promise.all(batch.map(async (url) => {
            try {
                const html = await fetchHtml(url);
                if (!html) return;
                const { text } = await htmlToTextEnriched(html, url);
                const extracted = await extractFn(text, url);
                if (extracted && extracted.length > 0) {
                    await saveFn(extracted, countryId);
                    successCount += extracted.length;
                }
            } catch (err) {
                // Ignore silent failures on massive scrape
            }
        }));
        console.log(`[${moduleName}] Processed ${Math.min(i + 5, urlArray.length)} / ${urlArray.length} ... inserted ${successCount} so far.`);
        await new Promise(r => setTimeout(r, 2000)); // Pacing
    }

    console.log(`--- Finished Module: ${moduleName.toUpperCase()}. Total Inserted: ${successCount} ---`);
    return successCount;
}

async function main() {
    console.log("Starting Massive Scrape for 1500 Sites...");

    const results: Record<string, number> = {};

    // Jobs
    results.jobs = await scrapeModule('jobs', QUERIES.jobs, jobs, extractJobsWithAI, async (data, cid) => {
        await saveJobs(data, 'KE');
    });

    // Tenders
    results.tenders = await scrapeModule('tenders', QUERIES.tenders, tenders, extractTendersWithAI, async (data, cid) => {
        for (const t of data) {
            await db.insert(tenders).values({
                title: t.title,
                description: t.description,
                buyerName: t.buyerName,
                countryId: cid,
                sourceUrl: t.sourceUrl,
                publishedAt: t.publishedDate || new Date(),
                deadline: t.deadlineDate,
                referenceNumber: t.referenceNumber || 'UNKNOWN'
            }).onConflictDoNothing();
        }
    });

    // Compliance
    results.compliance = await scrapeModule('compliance', QUERIES.compliance, complianceRequirements, extractComplianceWithAI, async (data, cid) => {
        for (const c of data) {
            await db.insert(complianceRequirements).values({
                title: c.title,
                summary: c.summary,
                countryId: cid,
                sourceUrl: c.sourceUrl,
                category: c.category,
                penaltyDetails: c.penaltyDetails,
                lastUpdated: new Date()
            }).onConflictDoNothing();
        }
    });

    // Health
    results.health = await scrapeModule('health', QUERIES.health, healthDataPoints, extractHealthWithAI, async (data, cid) => {
        for (const h of data) {
            await db.insert(healthDataPoints).values({
                indicatorCode: h.indicatorCode || 'GENERIC',
                indicatorName: h.indicatorName,
                countryId: cid,
                value: String(h.value),
                year: h.year || new Date().getFullYear(),
                source: h.sourceUrl
            }).onConflictDoNothing();
        }
    });

    // Salaries
    results.salaries = await scrapeModule('salaries', QUERIES.salaries, salarySubmissions, extractSalariesWithAI, async (data, cid) => {
        const catId = await getCategoryId('General');
        for (const s of data) {
            await db.insert(salarySubmissions).values({
                jobTitle: s.jobTitle,
                employerName: s.employerName,
                countryId: cid,
                jobCategoryId: catId,
                grossMonthlySalary: s.grossMonthlySalary.toString(),
                currency: s.currency,
                employmentType: s.employmentType,
                experienceLevel: s.experienceLevel,
                submittedAt: new Date()
            }).onConflictDoNothing();
        }
    });

    console.log("\n\n=========================================");
    console.log("FINAL REPORT");
    console.log("=========================================");
    console.log("Jobs Added:       ", results.jobs);
    console.log("Tenders Added:    ", results.tenders);
    console.log("Compliance Added: ", results.compliance);
    console.log("Health Added:     ", results.health);
    console.log("Salaries Added:   ", results.salaries);
    console.log("=========================================");
    
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
