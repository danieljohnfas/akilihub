import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { isEmployerUrl, isAtsPlatform, isGovernmentPortal, isAggregatorUrl } from '../src/lib/sources/aggregators';

async function searchDirectEmployer(company: string, title: string) {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    console.log('No SERPER_API_KEY');
    return;
  }

  const queries = [
    `"${company}" "${title}" (careers OR apply OR job OR jobs)`,
    `site:talentclue.com OR site:myworkdayjobs.com OR site:greenhouse.io OR site:lever.co OR site:bamboohr.com OR site:smartrecruiters.com OR site:recruitee.com "${company}" "${title}"`,
    `"${company}" "${title}" apply`,
  ];

  for (const q of queries) {
    console.log(`Query: ${q}`);
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, num: 10 }),
    });
    const data = await res.json();
    if (data.organic) {
      for (const item of data.organic) {
        const link = item.link;
        const domain = new URL(link).hostname;
        console.log(`  -> [${item.title?.slice(0, 50)}] ${link}`);
        console.log(`     isEmployer: ${isEmployerUrl(link)}, isATS: ${isAtsPlatform(link)}, isAggregator: ${isAggregatorUrl(link)}`);
      }
    }
    console.log('-----------------------------------');
  }
}

async function run() {
  console.log('Searching for Ayuda en Acción - Country Director...');
  await searchDirectEmployer('Ayuda en Acción', 'Country Director');
}

run();
