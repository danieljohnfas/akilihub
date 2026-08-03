/**
 * Rescrape Health + Salaries
 * --------------------------
 * Health:   Pulls from World Bank Open Data API + WHO GHO (free, no auth).
 * Salaries: Runs AI broad search per country, saves new submissions to DB.
 *
 * Run with: npx tsx scripts/rescrape-health-salaries.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { fetchAllHealthIndicators } from '../src/lib/scrapers/health-world-bank';
import { discoverSalaries } from '../src/lib/scrapers/broad-search-engine-salaries';
import { saveSalariesDb } from '../src/inngest/scrape-salaries';
import * as fs from 'fs';
import * as path from 'path';

process.on('uncaughtException', (err) => {
    console.error('[Fatal] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Fatal] Unhandled rejection:', reason);
});

const SALARY_QUERIES: Array<{ country: string; code: string; query: string }> = [
    { country: 'Kenya',    code: 'KE', query: 'average salary benchmarks software developer accountant teacher doctor Kenya 2026 KES shillings' },
    { country: 'Tanzania', code: 'TZ', query: 'average salary benchmarks software developer accountant teacher doctor Tanzania 2026 TZS shillings' },
    { country: 'Uganda',   code: 'UG', query: 'average salary benchmarks software developer accountant teacher doctor Uganda 2026 UGX shillings' },
    { country: 'Rwanda',   code: 'RW', query: 'average salary benchmarks software developer accountant teacher doctor Rwanda 2026 RWF francs' },
    { country: 'Ethiopia', code: 'ET', query: 'average salary benchmarks software developer accountant teacher doctor Ethiopia 2026 ETB birr' },
    { country: 'DRC',      code: 'CD', query: 'salaire moyen développeur logiciel comptable enseignant médecin RDC Congo 2026 CDF franc' },
];

async function main() {
    console.log('=============================================================');
    console.log('  RESCRAPE: Health (World Bank + WHO) + Salaries (AI Search)');
    console.log('=============================================================\n');

    const results: Record<string, number> = { health: 0, salaries: 0 };

    // ── 1. HEALTH (World Bank Open Data + WHO GHO) ────────────────────────────
    console.log('\n--- HEALTH DATA (World Bank + WHO GHO APIs) ---');
    console.log('Fetching all 12 indicators across 6 countries...\n');
    try {
        results.health = await fetchAllHealthIndicators();
        console.log(`\n✅ Health: ${results.health} data points upserted.\n`);
    } catch (err: any) {
        console.error('❌ Health scrape failed:', err.message);
    }

    // ── 2. SALARIES (AI Broad Search per country) ─────────────────────────────
    console.log('\n--- SALARIES (AI Broad Search) ---');
    for (const q of SALARY_QUERIES) {
        console.log(`\n[Salaries] ${q.country} (${q.code})...`);
        try {
            const discovered = await discoverSalaries(q.query, 3);
            console.log(`  Found ${discovered.length} salary data points.`);
            if (discovered.length > 0) {
                const inserted = await saveSalariesDb(discovered, q.code);
                results.salaries += inserted;
                console.log(`  ✅ Inserted ${inserted} new salary records.`);
            }
        } catch (err: any) {
            console.error(`  ❌ Failed for ${q.country}:`, err.message);
        }
        // Polite pacing between countries
        await new Promise(r => setTimeout(r, 3000));
    }

    // ── Final Report ───────────────────────────────────────────────────────────
    const reportStr = `
# Rescrape Final Report (Full Run)

## Previously Completed
- **Jobs Updated**: 981
- **Tenders Updated**: 26
- **Compliance Updated**: 143

## This Run (${new Date().toISOString()})
- **Health Data Points Upserted**: ${results.health}
  - Source: World Bank Open Data API + WHO Global Health Observatory
  - Indicators: MMR, U5MR, HIV_PREV, TB_INC, LIFE_EXP, UHC_INDEX, DPT_VACC, ANC_VISITS, HEALTH_EXP, MALARIA_INC, STUNTING, SBA
  - Countries: KE, TZ, UG, RW, ET, CD
- **Salaries Inserted**: ${results.salaries}
  - Source: AI Broad Search (Google → scrape → AI extract)
  - Countries: KE, TZ, UG, RW, ET, CD

## Notes
- Health data now sourced from official APIs (World Bank + WHO), not web scraping.
- Old seeded salary data (from seed-salaries.ts) remains; new AI-scraped data is additive.
`;

    const reportPath = path.join(__dirname, 'rescrape_final_report.md');
    fs.writeFileSync(reportPath, reportStr);
    console.log('\n=============================================================');
    console.log(reportStr);
    console.log('=============================================================');
    console.log(`Report saved to ${reportPath}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('[Fatal]', err);
    process.exit(1);
});
