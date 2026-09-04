import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { discoverJobs } from '../src/lib/scrapers/broad-search-engine';
import { saveJobs } from '../src/inngest/scrape-jobs';

const TARGET_NEW_JOBS = 2000;

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
  const allCountries = Object.keys(countriesMap);
  
  for (const countryCode of allCountries) {
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
        console.error(`Error during query "${query}":`, e);
      }
    }
  }
}

run().catch(console.error).finally(() => process.exit(0));
