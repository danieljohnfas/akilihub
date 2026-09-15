import fs from 'fs';
const text = fs.readFileSync('src/lib/sources/aggregators.ts', 'utf8');
const lines = text.split('\n');
let aggregators = 0;
let ats = 0;
let gov = 0;
lines.forEach(l => {
  if (l.includes("type: 'aggregator'")) aggregators++;
  if (l.includes("type: 'ats_platform'")) ats++;
  if (l.includes("type: 'government_portal'")) gov++;
});
console.log('Aggregators:', aggregators);
console.log('ATS Platforms:', ats);
console.log('Gov Portals:', gov);

const scrapersDir = fs.readdirSync('src/lib/scrapers').filter(f => f.endsWith('.ts'));
console.log('Scraper Files:', scrapersDir.length);
console.log(scrapersDir.join(', '));
