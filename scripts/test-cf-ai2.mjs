import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

async function testCloudflareAI() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = "process.env.CLOUDFLARE_API_TOKEN || ''";
  
  console.log(`Testing Workers AI for account: ${accountId}`);
  
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/cloudflare/clef-flash`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      state: "The checkout is broken.",
      questions: {
        isBroken: {
          type: "noul",
          instructions: "Is the checkout broken?"
        }
      }
    })
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testCloudflareAI().catch(console.error);
