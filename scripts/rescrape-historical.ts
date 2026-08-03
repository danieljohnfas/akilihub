import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { healthDataPoints, healthIndicators } from '@/lib/db/schema/health';
import { fetchHtml, htmlToTextEnriched } from '@/lib/scrapers/compliance-base';
import { extractJobsWithAI } from '@/lib/scrapers/broad-search-engine';
import { extractTendersWithAI } from '@/lib/scrapers/broad-search-engine-tenders';
import { extractComplianceWithAI } from '@/lib/scrapers/broad-search-engine-compliance';
import { extractHealthWithAI } from '@/lib/scrapers/broad-search-engine-health';
import { eq, isNotNull } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

process.on('uncaughtException', (err) => {
    console.error('Caught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function getUrls(table: any, column: any): Promise<string[]> {
    const rows = await db.selectDistinct({ url: column }).from(table).where(isNotNull(column));
    return rows.map((r: any) => r.url).filter(Boolean) as string[];
}

async function rescrapeModule(
    moduleName: string,
    urls: string[],
    table: any,
    column: any,
    extractFn: (text: string, url: string, pdfLinks: string[]) => Promise<any[]>,
    updateFn: (data: any[], url: string) => Promise<void>
) {
    console.log(`\n\n--- Starting Rescrape: ${moduleName.toUpperCase()} ---`);
    console.log(`Found ${urls.length} URLs to process.`);
    
    let updatedCount = 0;
    
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
            const html = await fetchHtml(url);
            if (!html) {
                console.log(`[${moduleName}] skipped (fetch failed) ${url}`);
                continue;
            }
            
            const { text, pdfLinks } = await htmlToTextEnriched(html, url);
            const extracted = await extractFn(text, url, pdfLinks);
            
            if (extracted && extracted.length > 0) {
                await updateFn(extracted, url);
                updatedCount++;
                console.log(`[${moduleName}] ${i+1}/${urls.length} Updated: ${url}`);
            } else {
                console.log(`[${moduleName}] ${i+1}/${urls.length} No data found for: ${url}`);
            }
        } catch (err: any) {
            console.error(`[${moduleName}] Failed on ${url}:`, err.message);
        }
        
        // Pacing to avoid getting locked out
        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log(`--- Finished Rescrape: ${moduleName.toUpperCase()}. Total Updated: ${updatedCount} ---`);
    return updatedCount;
}

async function main() {
    console.log('Starting Massive Historical Rescrape...');
    const results: Record<string, number> = {};

    // 1. JOBS (COMPLETED)
    // const jobUrls = await getUrls(jobs, jobs.sourceUrl);
    // results.jobs = await rescrapeModule(
    //     'jobs', jobUrls, jobs, jobs.sourceUrl,
    //     (text, url, _pdfLinks) => extractJobsWithAI(text, url),
    //     async (data, url) => {
    //         const job = data[0]; // Take the primary job extracted from the page
    //         await db.update(jobs).set({
    //             title: job.title,
    //             description: job.description, // FULL description from new AI prompt
    //             requirements: job.requirements,
    //             jobType: job.jobType,
    //             postedDate: job.postedDate || new Date(),
    //             deadline: job.deadline ?? null,
    //             salaryMin: job.salaryMin ? String(job.salaryMin) : null,
    //             salaryMax: job.salaryMax ? String(job.salaryMax) : null,
    //             updatedAt: new Date()
    //         }).where(eq(jobs.sourceUrl, url));
    //     }
    // );
    results.jobs = 981; // Hardcoded from completed run

    // 2. TENDERS
    const tenderUrls = await getUrls(tenders, tenders.sourceUrl);
    results.tenders = await rescrapeModule(
        'tenders', tenderUrls, tenders, tenders.sourceUrl,
        (text, url, pdfLinks) => extractTendersWithAI(text, url, pdfLinks),
        async (data, url) => {
            const t = data[0];
            await db.update(tenders).set({
                title: t.title,
                description: t.description,
                category: t.category || 'services',
                deadline: t.deadline || null,
                budget: t.budget ? String(t.budget) : null,
                updatedAt: new Date()
            }).where(eq(tenders.sourceUrl, url));
        }
    );

    // 3. COMPLIANCE
    const complianceUrls = await getUrls(complianceRequirements, complianceRequirements.sourceUrl);
    results.compliance = await rescrapeModule(
        'compliance', complianceUrls, complianceRequirements, complianceRequirements.sourceUrl,
        (text, url, pdfLinks) => extractComplianceWithAI(text, url, pdfLinks),
        async (data, url) => {
            const c = data[0];
            await db.update(complianceRequirements).set({
                title: c.title,
                description: c.description,
                category: c.category,
                issuingAuthority: c.issuingAuthority || 'Various',
                resourceType: c.resourceType || 'guideline',
                updatedAt: new Date()
            }).where(eq(complianceRequirements.sourceUrl, url));
        }
    );

    // 4. HEALTH
    const healthUrls = await getUrls(healthDataPoints, healthDataPoints.source);
    results.health = await rescrapeModule(
        'health', healthUrls, healthDataPoints, healthDataPoints.source,
        (text, url, pdfLinks) => extractHealthWithAI(text, url, pdfLinks),
        async (data, url) => {
            const h = data[0];
            if (!h) return;
            
            // Update indicator name
            await db.update(healthIndicators)
                .set({ name: h.indicatorName || 'Unknown Indicator' })
                .where(eq(healthIndicators.code, h.indicatorCode || ''));
                
            // Update data point value/year based on source
            await db.update(healthDataPoints)
                .set({ 
                    value: String(h.value),
                    year: h.year || new Date().getFullYear(),
                })
                .where(eq(healthDataPoints.source, url));
        }
    );

    // Final Report Output
    const reportStr = `
# Rescrape Execution Report
- **Jobs Updated**: ${results.jobs}
- **Tenders Updated**: ${results.tenders}
- **Compliance Updated**: ${results.compliance}
- **Health Data Updated**: ${results.health}

*Note: Salaries module had its database schema updated to track source URLs today. Prior salary entries were untraceable for a historical rescrape.*
`;
    fs.writeFileSync(path.join(__dirname, 'rescrape_final_report.md'), reportStr);
    console.log(reportStr);
    process.exit(0);
}

main().catch(console.error);
