import fs from 'fs';
import path from 'path';
import { db } from '../db/client';
import { jobs } from '../db/schema/jobs';
import { fetchOracleJobs } from './ats-handlers/oracle';
import { fetchWorkdayJobs } from './ats-handlers/workday';
import { fetchGreenhouseJobs } from './ats-handlers/greenhouse';
import { fetchLeverJobs } from './ats-handlers/lever';
import { fetchSmartRecruitersJobs } from './ats-handlers/smartrecruiters';

export async function runAtsSync() {
  console.log("[ATS Sync Engine] Starting daily ATS synchronization...");

  const registryPath = path.join(process.cwd(), 'src/lib/sources/ats-registry.json');
  let registry: any[] = [];
  try {
    const fileContent = fs.readFileSync(registryPath, 'utf-8');
    registry = JSON.parse(fileContent);
  } catch (error) {
    console.error("[ATS Sync Engine] Failed to read ats-registry.json", error);
    return;
  }

  let totalInserted = 0;

  for (const config of registry) {
    console.log(`[ATS Sync Engine] Syncing ${config.companyName} (${config.atsType})...`);
    
    let scrapedJobs: any[] = [];
    
    try {
      if (config.atsType === 'oracle_hcm') {
        scrapedJobs = await fetchOracleJobs(config);
      } else if (config.atsType === 'workday') {
        scrapedJobs = await fetchWorkdayJobs(config);
      } else if (config.atsType === 'greenhouse') {
        scrapedJobs = await fetchGreenhouseJobs(config);
      } else if (config.atsType === 'lever') {
        scrapedJobs = await fetchLeverJobs(config);
      } else if (config.atsType === 'smartrecruiters') {
        scrapedJobs = await fetchSmartRecruitersJobs(config);
      } else {
        console.warn(`[ATS Sync Engine] Unsupported ATS type: ${config.atsType}`);
      }
    } catch (e) {
      console.error(`[ATS Sync Engine] Handler failed for ${config.companyName}:`, e);
    }

    if (scrapedJobs.length > 0) {
      console.log(`[ATS Sync Engine] ${config.companyName}: Fetched ${scrapedJobs.length} active jobs. Inserting...`);
      
      // Batch insert with conflict ignore to prevent duplicates
      for (let i = 0; i < scrapedJobs.length; i += 50) {
        const chunk = scrapedJobs.slice(i, i + 50);
        try {
          const result = await db.insert(jobs).values(chunk).onConflictDoNothing().returning({ id: jobs.id });
          totalInserted += result.length;
        } catch (e: any) {
          console.error(`[ATS Sync Engine] Batch insert error for ${config.companyName}:`, e.message);
        }
      }
    } else {
      console.log(`[ATS Sync Engine] ${config.companyName}: No new jobs found or fetch failed.`);
    }
  }

  console.log(`[ATS Sync Engine] Synchronization complete! Total new jobs inserted: ${totalInserted}`);
  return totalInserted;
}
