import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { eq, or, isNull } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from '@/lib/scrapers/compliance-base';
import { extractJobsWithAI } from '@/lib/scrapers/broad-search-engine';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'scratch', 'rescraped-ids.json');

function loadRescrapedIds(): Set<string> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.error("Failed to load state file:", e);
  }
  return new Set();
}

function saveRescrapedIds(ids: Set<string>) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(Array.from(ids), null, 2));
  } catch (e) {
    console.error("Failed to save state file:", e);
  }
}

// Simple Levenshtein or inclusion match for safety
function isTitleMatch(original: string, extracted: string): boolean {
  const o = original.toLowerCase();
  const e = extracted.toLowerCase();
  if (o.includes(e) || e.includes(o)) return true;
  // Check if at least 50% of words match
  const oWords = o.split(/\W+/).filter(w => w.length > 2);
  const eWords = e.split(/\W+/).filter(w => w.length > 2);
  let matchCount = 0;
  for (const w of oWords) {
    if (eWords.includes(w)) matchCount++;
  }
  return matchCount > 0 && (matchCount / oWords.length >= 0.5 || matchCount / eWords.length >= 0.5);
}

async function processJob(job: any): Promise<boolean> {
  try {
    console.log(`\nRescraping: ${job.title} (${job.id})`);
    console.log(`URL: ${job.sourceUrl}`);

    const html = await fetchHtml(job.sourceUrl);
    if (!html) {
      console.warn(`Failed to fetch HTML for ${job.id}`);
      return false;
    }

    const { text } = await htmlToTextEnriched(html, job.sourceUrl);
    if (!text) {
      console.warn(`Failed to extract text for ${job.id}`);
      return false;
    }

    // AI Extraction
    const extracted = await extractJobsWithAI(text, job.sourceUrl);
    
    if (extracted && extracted.length > 0) {
      // Find the best matching job title
      let bestMatch = extracted[0];
      for (const ex of extracted) {
        if (isTitleMatch(job.title, ex.title)) {
          bestMatch = ex;
          break;
        }
      }
      
      const newPosted = bestMatch.postedDate || null;
      const newDeadline = bestMatch.deadline || null;

      console.log(`Found Dates -> Posted: ${newPosted}, Deadline: ${newDeadline}`);

      await db.update(jobs)
        .set({
          postedDate: newPosted,
          deadline: newDeadline
        })
        .where(eq(jobs.id, job.id));
      
      console.log(`Updated ${job.id} successfully.`);
      return true; // Success!
    } else {
      console.warn(`AI extraction found 0 jobs for ${job.id}`);
      return false;
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    return false;
  }
}

async function main() {
  const allJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    sourceUrl: jobs.sourceUrl,
    postedDate: jobs.postedDate,
    deadline: jobs.deadline,
    createdAt: jobs.createdAt
  }).from(jobs);

  const rescrapedIds = loadRescrapedIds();

  let jobsToFix = allJobs.filter(j => {
    // Skip if already rescraped
    if (rescrapedIds.has(j.id)) return false;
    
    // Rescrape if missing dates
    if (!j.postedDate || !j.deadline) return true;
    
    return false;
  });

  const maxPasses = 5;
  let pass = 1;

  while (jobsToFix.length > 0 && pass <= maxPasses) {
    console.log(`\n===========================================`);
    console.log(`--- PASS ${pass} of ${maxPasses} ---`);
    console.log(`Found ${jobsToFix.length} jobs to rescrape.`);
    console.log(`===========================================\n`);

    const failedJobs: any[] = [];
    const limit = 5;

    for (let i = 0; i < jobsToFix.length; i += limit) {
      const batch = jobsToFix.slice(i, i + limit);
      
      const results = await Promise.all(batch.map(j => processJob(j)));
      
      // Collect the ones that failed, save success/failure state
      for (let j = 0; j < results.length; j++) {
        const jobId = batch[j].id;
        if (!results[j]) {
          failedJobs.push(batch[j]);
        } else {
          rescrapedIds.add(jobId);
        }
      }
      
      // Save state every batch
      saveRescrapedIds(rescrapedIds);
      
      // Delay to be polite and avoid rate limits
      await new Promise(res => setTimeout(res, 5000));
    }

    jobsToFix = failedJobs;
    
    if (jobsToFix.length > 0) {
      console.log(`\nPass ${pass} finished. ${jobsToFix.length} jobs failed.`);
      pass++;
      if (pass <= maxPasses) {
        console.log(`Waiting 30 seconds before next pass to let AI limiters cool down...\n`);
        await new Promise(res => setTimeout(res, 30000));
      }
    } else {
      break;
    }
  }

  // Record permanent failures
  if (jobsToFix.length > 0) {
    for (const job of jobsToFix) {
      rescrapedIds.add(job.id);
    }
    saveRescrapedIds(rescrapedIds);
  }

  if (jobsToFix.length > 0) {
    console.log(`\nFinished all ${maxPasses} passes. ${jobsToFix.length} jobs could not be resolved (likely dead URLs or permanent AI extraction failures).`);
  } else {
    console.log(`\nSuccessfully rescraped and updated all jobs!`);
  }
  
  process.exit(0);
}

main().catch(console.error);
