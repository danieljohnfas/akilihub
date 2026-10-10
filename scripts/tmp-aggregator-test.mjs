import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const { noul, score } = require('@typesafe-ai/sdk');
const { systemOne } = require('./scripts/clef-client.mjs');

async function test(url) {
  try {
    const res = await systemOne({
      state: `URL: ${url}`,
      questions: {
        isAggregator: noul('Is this URL a job aggregator/job board (like Indeed, LinkedIn, BrighterMonday, JobWeb, etc) as opposed to a direct employer website or ATS (Applicant Tracking System)?')
      }
    });
    console.log(`${url.padEnd(50)} -> Aggregator Probability: ${res.answers.isAggregator.noul}`);
  } catch(e) {
    console.error(e.message);
  }
}

async function run() {
  await test('https://www.jobwebkenya.com/jobs/123');
  await test('https://careers.google.com/jobs/results/123');
  await test('https://jobs.tz.cari.africa/jobs/view/492482');
  await test('https://unilever.workday.com/jobs');
  await test('https://myjobmag.com/job/123');
  await test('https://www.safaricom.co.ke/careers');
}
run();
