import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const { TypeSafeClient, noul } = require('@typesafe-ai/sdk');

const jev = new TypeSafeClient({
  apiKey: process.env.TYPESAFE_API_KEY.trim(),
});

async function testModel(modelName) {
  try {
    const res = await jev.systemOne({
      model: modelName,
      state: 'The system is down.',
      questions: {
        isDown: noul('Is the system down?', { true: 'Yes', false: 'No' })
      }
    });
    console.log(`Success with ${modelName}:`, res.answers.isDown.noul);
  } catch (e) {
    console.error(`Failed with ${modelName}:`, e.message);
  }
}

async function run() {
  await testModel('jev-1.13.0');
  await testModel('@cf/cloudflare/clef-flash');
  await testModel('clef-flash');
}
run();
