import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const { TypeSafeClient } = require('@typesafe-ai/sdk');

// Initialize Typesafe Jev client for fallback
const jevClient = process.env.TYPESAFE_API_KEY 
  ? new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY.trim() })
  : null;

/**
 * Drop-in replacement for jev.systemOne using Cloudflare Clef-flash with Jev fallback
 */
export async function systemOne(request, options = {}) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
  
  let cloudflareError = null;

  // 1. Try Cloudflare Workers AI first
  if (accountId && token) {
    try {
      const modelName = request.model === 'clef' ? '@cf/cloudflare/clef' : '@cf/cloudflare/clef-flash';
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          state: request.state,
          questions: request.questions
        }),
        signal: options.signal || (options.timeout ? AbortSignal.timeout(options.timeout) : undefined)
      });

      const responseText = await res.text();
      
      if (!res.ok) {
        throw new Error(`Cloudflare HTTP ${res.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      if (!data.success) {
        throw new Error(`Cloudflare API Error: ${JSON.stringify(data.errors)}`);
      }

      return data.result;
    } catch (e) {
      console.warn(`[Fallback] Cloudflare Clef failed: ${e.message}. Falling back to Jev...`);
      cloudflareError = e;
    }
  }

  // 2. Fallback to Typesafe API (Jev)
  if (!jevClient) {
    throw new Error(`No fallback available. Cloudflare failed (${cloudflareError?.message || 'Missing credentials'}) and TYPESAFE_API_KEY is not set.`);
  }

  // Make sure we pass the correct model name for Typesafe (or let it use its default jev-latest)
  // If the original request strictly asked for 'clef', Typesafe won't understand it, so we strip it.
  const fallbackRequest = {
    ...request,
    model: 'jev-1.13.0' // Use a known stable Jev model
  };

  const res = await jevClient.systemOne(fallbackRequest, options);
  
  // The SDK returns { answers, usage, model } natively, we just need to return it as is, 
  // but let's make sure it matches the structure expected by our scripts. 
  // Actually, Typesafe SDK returns the full result object, same as Cloudflare.
  return res;
}
