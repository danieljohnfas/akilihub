import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const { TypeSafeClient } = require('@typesafe-ai/sdk');

async function testSDK() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = "process.env.CLOUDFLARE_API_TOKEN || ''";
  
  // Try to use the SDK with Cloudflare's endpoint
  const jev = new TypeSafeClient({
    apiKey: token,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/cloudflare/clef-flash`
  });
  
  try {
    const res = await jev.systemOne({
      state: "The checkout is broken.",
      questions: {
        isBroken: { type: "noul", instructions: "Is the checkout broken?" }
      }
    });
    console.log("Success:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

testSDK();
