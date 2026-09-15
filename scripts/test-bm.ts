import { execSync } from 'child_process';
import * as fs from 'fs';

async function main() {
  const pythonScript = `
from curl_cffi import requests
r = requests.get('https://www.brightermonday.co.ke/jobs?page=1', impersonate='chrome110', timeout=30)
with open('bm_jobs.html', 'w', encoding='utf-8') as f:
    f.write(r.text)
`;
  execSync(`python -c "${pythonScript.replace(/"/g, '\\"')}"`);
  console.log('Saved to bm_jobs.html');
}

main().catch(console.error);
