import { config } from 'dotenv';
config({ path: '.env.local' });
import { searchGoogle } from '../src/lib/scrapers/broad-search-engine';
import fs from 'fs';
import path from 'path';

const REGISTRY_PATH = path.join(__dirname, '../src/lib/sources/ats-registry.json');

async function discoverAtsBoardsAllCountries() {
  const targetCountries = ["Tanzania", "Kenya", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
  
  const platforms = [
    { name: 'Greenhouse', urlMatch: /boards\.greenhouse\.io\/([^\/]+)/, searchString: '"boards.greenhouse.io"' },
    { name: 'Lever', urlMatch: /jobs\.lever\.co\/([^\/]+)/, searchString: '"jobs.lever.co"' },
    { name: 'SmartRecruiters', urlMatch: /careers\.smartrecruiters\.com\/([^\/]+)/, searchString: '"careers.smartrecruiters.com"' }
  ];

  // Load existing registry
  const registryText = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  const registry = JSON.parse(registryText);
  let newlyAdded = 0;

  for (const country of targetCountries) {
    for (const plat of platforms) {
      console.log(`Searching ${plat.name} boards for ${country}...`);
      try {
        const query = `${plat.searchString} ${country}`;
        const urls = await searchGoogle(query, 50);
        
        for (const url of urls) {
          const match = url.match(plat.urlMatch);
          if (match && match[1] && !match[1].includes('embed')) {
            const boardToken = match[1].split('?')[0]; // Clean query params
            
            // Check if already in registry
            const exists = registry.some((r: any) => r.company === boardToken || r.boardToken === boardToken);
            if (!exists) {
              registry.push({
                company: boardToken,
                atsType: plat.name,
                boardToken: boardToken,
                country: country
              });
              newlyAdded++;
              console.log(`[+] Added ${plat.name} board: ${boardToken} (${country})`);
            }
          }
        }
      } catch (e: any) {
        console.log(`Error searching ${plat.name} for ${country}: ${e.message}`);
      }
    }
  }

  if (newlyAdded > 0) {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
    console.log(`\nSuccess: Added ${newlyAdded} new ATS boards to the registry!`);
  } else {
    console.log(`\nNo new ATS boards found to add.`);
  }
}

discoverAtsBoardsAllCountries().then(() => process.exit(0));
