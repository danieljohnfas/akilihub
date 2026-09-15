import { spawn } from 'child_process';
const countries = ['TZ', 'KE', 'UG', 'RW', 'ET', 'CD', 'BI', 'SO', 'SS'];

async function run() {
  while (true) {
    for (const country of countries) {
      console.log('\n====================================');
      console.log('=== SCRAPING ' + country + ' ===');
      console.log('====================================\n');
      await new Promise((resolve) => {
        const child = spawn('npx', ['tsx', '--env-file=.env', 'scripts/mass-scrape.ts', country], { stdio: 'inherit' });
        child.on('close', resolve);
      });
    }
  }
}
run();
