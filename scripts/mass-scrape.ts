import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { discoverJobs } from '../src/lib/scrapers/broad-search-engine';
import { configureSearchBreaker, SearchUnavailableError } from '../src/lib/scrapers/search-health';
import { saveJobs } from '../src/inngest/scrape-jobs';

const TARGET_NEW_JOBS = 2000;

// Optional wall-clock budget (the workflow sets it below the job timeout) so a healthy run ends
// cleanly with exit 0 instead of being cancelled by the runner, which shows up as "cancelled", not red.
const budgetMinutes = Number(process.env.MASS_SCRAPE_MAX_MINUTES);
const deadline = Number.isFinite(budgetMinutes) && budgetMinutes > 0 ? Date.now() + budgetMinutes * 60_000 : null;
const outOfTime = () => deadline !== null && Date.now() >= deadline;

const countriesMap: Record<string, { cities: string[], keywords: string[] }> = {
  'TZ': {
    cities: ['Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga', 'Zanzibar'],
    keywords: ['Tanzania', 'ajira mpya', 'nafasi za kazi']
  },
  'KE': {
    cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kakamega'],
    keywords: ['Kenya', 'jobs hiring', 'vacancies']
  },
  'UG': {
    cities: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale'],
    keywords: ['Uganda', 'jobs vacancies']
  },
  'RW': {
    cities: ['Kigali', 'Butare', 'Gitarama', 'Musanze', 'Gisenyi'],
    keywords: ['Rwanda', 'jobs vacancies', 'emploi']
  },
  'ET': {
    cities: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Awasa'],
    keywords: ['Ethiopia', 'jobs', 'ስራ']
  },
  'CD': {
    cities: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma'],
    keywords: ['DRC', 'Congo', 'offres emploi', 'recrutement']
  },
  'BI': {
    cities: ['Bujumbura', 'Gitega', 'Muyinga', 'Ngozi'],
    keywords: ['Burundi', 'offres emploi', 'recrutement']
  },
  'SO': {
    cities: ['Mogadishu', 'Hargeisa', 'Kismayo', 'Bosaso'],
    keywords: ['Somalia', 'Somaliland', 'jobs', 'shaqo', 'وظائف']
  },
  'SS': {
    cities: ['Juba', 'Malakal', 'Wau', 'Yei'],
    keywords: ['South Sudan', 'jobs', 'NGO']
  }
};

const titles = [
  'NGO jobs', 'UN jobs', 'software developer', 'accountant',
  'civil engineer', 'health medical', 'nurse', 'doctor',
  'teacher', 'lecturer', 'project manager', 'driver',
  'logistics', 'sales', 'marketing', 'human resources',
  'finance', 'banking', 'agriculture', 'technician',
  'plumber', 'electrician', 'mechanic', 'security',
  'cleaner', 'cook', 'receptionist', 'customer service',
  'pharmacist', 'lab technician', 'lawyer', 'legal counsel',
  'data analyst', 'graphic designer', 'social worker', 'operations manager'
];

async function run() {
  // Stop with a failing exit code when every search engine has been empty for N queries in a row
  // (out of credits/quota) rather than looping through thousands of queries until the timeout.
  configureSearchBreaker();
  const allCountries = Object.keys(countriesMap);

  for (const countryCode of allCountries) {
    if (outOfTime()) break;
    const config = countriesMap[countryCode];
    const queries: string[] = [];

    for (const title of titles) {
      for (const city of config.cities) {
        for (const keyword of config.keywords) {
          queries.push(`${title} ${city} ${keyword} 2026`);
        }
      }
    }

    // Shuffle queries
    queries.sort(() => Math.random() - 0.5);

    console.log(`\n======================================================`);
    console.log(`Starting mass scrape for ${countryCode}`);
    console.log(`Target: ${TARGET_NEW_JOBS} NEW jobs`);
    console.log(`Total queries generated: ${queries.length}`);
    console.log(`======================================================\n`);

    let newlyInserted = 0;

    for (const query of queries) {
      if (outOfTime()) {
        console.log(`Time budget of ${budgetMinutes} min reached. Stopping cleanly.`);
        break;
      }
      if (newlyInserted >= TARGET_NEW_JOBS) {
        console.log(`Reached target of ${TARGET_NEW_JOBS} NEW jobs for ${countryCode}. Moving to next country.`);
        break;
      }
      
      console.log(`\n--- [${countryCode}] Running query: "${query}" ---`);
      try {
        const discovered = await discoverJobs(query, 5);
        if (discovered.length > 0) {
          const inserted = await saveJobs(discovered, countryCode);
          newlyInserted += inserted;
          console.log(`Inserted ${inserted} new jobs out of ${discovered.length} discovered.`);
          console.log(`Progress for ${countryCode}: ${newlyInserted} / ${TARGET_NEW_JOBS} NEW jobs`);
        } else {
          console.log(`No jobs discovered for query.`);
        }
      } catch (e) {
        if (e instanceof SearchUnavailableError) throw e; // fatal: do not swallow it as a per-query error
        console.error(`Error during query "${query}":`, e);
      }
    }
  }
}

run()
  .catch((e) => {
    console.error(e instanceof SearchUnavailableError ? `\n[FATAL] ${e.message}` : e);
    process.exitCode = 1; // was always 0, so failures never turned the workflow red
  })
  .finally(() => process.exit());
