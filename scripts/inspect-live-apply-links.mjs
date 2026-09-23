import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function testFetch(name, url) {
  console.log(`\n========================================`);
  console.log(`Testing: ${name} (${url})`);
  console.log(`========================================`);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      console.log(`HTTP ${res.status}`);
      return;
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Look for application links
    console.log('Outbound links in content:');
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (!href) return;
      if (
        /apply|online|career|portal|submit|recruit|register|click here|official|view job/i.test(text) ||
        /erecruit|workday|greenhouse|lever|taleo|bamboohr|smartrecruiters|google\.com\/forms|forms\.gle|\.go\.|\.gov\./i.test(href)
      ) {
        console.log(`  - Text: "${text.slice(0, 50)}" -> Href: ${href}`);
      }
    });

    // Check mailto
    $('a[href^="mailto:"]').each((_, el) => {
      console.log(`  - Mailto: ${$(el).attr('href')} (Text: "${$(el).text().trim()}")`);
    });

  } catch (err) {
    console.log(`Fetch error: ${err.message}`);
  }
}

async function main() {
  // HotNigerianJobs sample
  await testFetch('HotNigerianJobs', 'https://www.hotnigerianjobs.com/hotjobs/432049/first-bank-of-nigeria-limited-recruitment.html');
  // Ajirayako sample
  await testFetch('Ajirayako', 'https://ajirayako.co.tz/job/crdb-bank-plc-job-vacancies-2024/');
  // JobWebKenya sample
  await testFetch('JobWebKenya', 'https://jobwebkenya.com/job/equity-bank-kenya-relationship-manager-sme-recruitment/');
}

main();
