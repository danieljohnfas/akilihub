import { Strategy } from './engine';
import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { businesses } from '../db/schema/compliance';
import { jobs } from '../db/schema/jobs';
import { ilike, desc, and, eq, or, isNull, gt } from 'drizzle-orm';

export interface AiInput {
  query: string;
  contextParams?: Record<string, any>;
}

export interface AiResult {
  response: string;
  confidence: number;
  sources: string[];
  strategyUsed?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are AkiliBrain's intelligent AI assistant for East Africa (Kenya, Tanzania, Uganda, Rwanda, Ethiopia, Congo DRC).

You help users with:
- Finding government tenders and procurement opportunities
- Business registration and compliance (TRA, KRA, BRELA, RDB)
- Health data and indicators across East Africa
- Salary benchmarks and career information
- Job matching based on CVs and skills

When presenting job matches, always include: Job Title, Company (Who is Recruiting), Location, and a link to /jobs/[id].
Always be concise, helpful, and specific to the East Africa context.`;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Pre-flight DB context builder
// Used by all strategies so DB results are always included regardless of AI
// ─────────────────────────────────────────────────────────────────────────────
async function buildDbContext(query: string): Promise<{ dbContext: string; sources: string[] }> {
  const lowerQuery = query.toLowerCase();
  const sources: string[] = [];
  let dbContext = '';

  const isJobMatch =
    lowerQuery.includes('cv') ||
    lowerQuery.includes('curriculum vitae') ||
    lowerQuery.includes('resume') ||
    lowerQuery.includes('find me a job') ||
    lowerQuery.includes('job match') ||
    lowerQuery.includes('best matching jobs') ||
    lowerQuery.includes('matching jobs');

  const isTenderSearch =
    lowerQuery.includes('tender') ||
    lowerQuery.includes('procurement') ||
    lowerQuery.includes('rfp') ||
    lowerQuery.includes('rfq');

  const isBusinessSearch =
    lowerQuery.includes('registered') ||
    lowerQuery.includes('brela') ||
    lowerQuery.includes('rdb') ||
    lowerQuery.includes('kra');

  if (isJobMatch) {
    // Dynamic keyword extraction from query text
    const KEYWORD_POOL = [
      'DHIS2', 'health information', 'information systems', 'project manager',
      'systems analyst', 'data analyst', 'data manager', 'NGO', 'public health',
      'software engineer', 'software developer', 'IT officer', 'monitoring',
      'evaluation', 'M&E', 'surveillance', 'epidemiology', 'HIV', 'AIDS',
      'community health', 'nurse', 'doctor', 'accountant', 'finance', 'procurement',
      'logistics', 'communications', 'program officer', 'field officer',
    ];
    const matchedKeywords = KEYWORD_POOL.filter(kw => lowerQuery.includes(kw.toLowerCase()));
    const searchKeywords = matchedKeywords.length > 0
      ? matchedKeywords.slice(0, 4)
      : ['health', 'information', 'data', 'systems'];

    const allResults: any[] = [];
    const activeFilter = and(
      eq(jobs.isActive, true),
      or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
    );
    for (const kw of searchKeywords) {
      const results = await db.select({
        id: jobs.id,
        title: jobs.title,
        companyName: jobs.companyName,
        location: jobs.location,
        jobType: jobs.jobType,
        deadline: jobs.deadline,
      })
        .from(jobs)
        .where(and(activeFilter, ilike(jobs.title, `%${kw}%`)))
        .orderBy(desc(jobs.createdAt))
        .limit(5);
      allResults.push(...results);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const uniqueResults = allResults.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    }).slice(0, 10);

    if (uniqueResults.length > 0) {
      sources.push('AkiliBrain Jobs Database');
      dbContext = `\n\n[Database Results - Active Job Openings]\n${JSON.stringify(
        uniqueResults.map(j => ({ ...j, link: `/jobs/${j.id}` })),
        null, 2
      )}`;
    } else {
      dbContext = '\n\n[Database Results] No active job openings currently match these keywords. New jobs are added daily — check back soon.';
    }
  } else if (isTenderSearch) {
    const keyword = lowerQuery.match(/\b(IT|ICT|health|construction|supply|education|road|water|NGO|medical|software|audit|consulting)\b/i)?.[0] || 'services';
    const results = await db.select({
      id: tenders.id,
      title: tenders.title,
      contractingAuthority: tenders.contractingAuthority,
      deadline: tenders.deadline,
      status: tenders.status,
    })
      .from(tenders)
      .where(ilike(tenders.title, `%${keyword}%`))
      .orderBy(desc(tenders.publishedAt))
      .limit(6);
    if (results.length > 0) {
      sources.push('AkiliBrain Tenders Database');
      dbContext = `\n\n[Database Results - Tenders]\n${JSON.stringify(results, null, 2)}`;
    }
  } else if (isBusinessSearch) {
    const nameMatch = query.match(/([A-Z][A-Za-z\s&]+(?:Ltd|Limited|Inc|Corp|Company|Co|PLC)\.?)/);
    if (nameMatch) {
      const results = await db.select().from(businesses)
        .where(ilike(businesses.name, `%${nameMatch[1]}%`))
        .limit(3);
      if (results.length > 0) {
        sources.push('AkiliBrain Compliance Database');
        dbContext = `\n\n[Database Results - Business Records]\n${JSON.stringify(results, null, 2)}`;
      }
    }
  }

  return { dbContext, sources };
}

function buildPrompt(query: string, dbContext: string): string {
  return dbContext
    ? `${query}${dbContext}\n\nBased on the database results above, please provide a helpful, well-formatted response.`
    : query;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRIMARY: Dify (Custom AI Workflow — highest fidelity)
// ─────────────────────────────────────────────────────────────────────────────
export class DifyStrategy implements Strategy<AiInput, AiResult> {
  name = 'Dify (Primary AI Workflow)';
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.DIFY_API_KEY;
    if (!apiKey) throw new Error('DIFY_API_KEY is not set.');
    const apiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    const inputVar = process.env.DIFY_INPUT_VAR || 'query';
    const response = await fetch(`${apiUrl}/workflows/run`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: { [inputVar]: input.query, ...input.contextParams },
        response_mode: 'blocking',
        user: 'akilibrain-system'
      })
    });
    if (!response.ok) throw new Error(`Dify API failed: ${response.status}`);
    const data = await response.json();
    if (data.data?.status !== 'succeeded') throw new Error(`Dify workflow failed: ${data.data?.error ?? data.data?.status}`);
    const outputs = data.data?.outputs ?? {};
    const text: string = outputs.text ?? outputs.answer ?? outputs.output ??
      Object.values(outputs).find((v): v is string => typeof v === 'string') ?? 'No response from workflow.';
    return { response: text, confidence: 0.95, sources: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Langflow (Custom Visual AI Workflow)
// ─────────────────────────────────────────────────────────────────────────────
export class LangflowStrategy implements Strategy<AiInput, AiResult> {
  name = 'Langflow (Fallback AI Workflow)';
  async execute(input: AiInput): Promise<AiResult> {
    const flowId = process.env.LANGFLOW_FLOW_ID;
    if (!flowId) throw new Error('LANGFLOW_FLOW_ID is not set.');
    const apiUrl = process.env.LANGFLOW_API_URL || 'http://localhost:7860';
    const response = await fetch(`${apiUrl}/api/v1/run/${flowId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_value: input.query, output_type: 'chat', input_type: 'chat' })
    });
    if (!response.ok) throw new Error(`Langflow API failed: ${response.status}`);
    const data = await response.json();
    const text = data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ?? 'Processed by Langflow';
    return { response: text, confidence: 0.85, sources: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generic Gemini strategy factory
// Each Gemini model has its own SEPARATE free-tier quota pool.
// By trying multiple models, we multiply our total free daily capacity.
//
// Free tier quotas (requests/day as of 2025):
//   gemini-2.0-flash-lite  → 1,500 RPD  (fastest, lightest)
//   gemini-2.0-flash        → 1,500 RPD
//   gemini-1.5-flash-8b     → 1,500 RPD  (smallest, very fast)
//   gemini-1.5-flash        → 1,500 RPD
//   gemini-1.5-pro          →    50 RPD  (most capable, low quota)
// ─────────────────────────────────────────────────────────────────────────────
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

function makeGeminiStrategy(modelName: string, strategyName: string, confidence = 0.90) {
  return class implements Strategy<AiInput, AiResult> {
    name = strategyName;
    async execute(input: AiInput): Promise<AiResult> {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set.');
      const { dbContext, sources } = await buildDbContext(input.query);
      const augmentedPrompt = buildPrompt(input.query, dbContext);
      const { text } = await generateText({
        model: google(modelName),
        system: SYSTEM_PROMPT,
        prompt: augmentedPrompt,
      });
      return {
        response: text || 'I was unable to generate a response.',
        confidence,
        sources,
      };
    }
  };
}

// 3a. Gemini 2.0 Flash Lite  — 1,500 RPD free (fastest, primary Gemini)
export const GeminiFlashLiteStrategy = makeGeminiStrategy('gemini-2.0-flash-lite', 'Gemini 2.0 Flash Lite', 0.88);
// 3b. Gemini 2.0 Flash       — 1,500 RPD free
export const GeminiFlashStrategy = makeGeminiStrategy('gemini-2.0-flash', 'Gemini 2.0 Flash', 0.90);
// 3c. Gemini 1.5 Flash 8B    — 1,500 RPD free (ultra-light, high quota)
export const GeminiFlash8BStrategy = makeGeminiStrategy('gemini-1.5-flash-8b', 'Gemini 1.5 Flash 8B', 0.85);
// 3d. Gemini 1.5 Flash       — 1,500 RPD free
export const GeminiFlash15Strategy = makeGeminiStrategy('gemini-1.5-flash', 'Gemini 1.5 Flash', 0.87);
// 3e. Gemini 1.5 Pro         — 50 RPD free (most capable, reserve for hard queries)
export const GeminiPro15Strategy = makeGeminiStrategy('gemini-1.5-pro', 'Gemini 1.5 Pro', 0.93);

// Legacy export for backward compat with route.ts
export const VercelAiSdkStrategy = GeminiFlashLiteStrategy;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generic OpenAI-compatible chat strategy factory
// Used for Groq, Mistral, Cerebras, Together AI, Cohere, Hugging Face, etc.
// ─────────────────────────────────────────────────────────────────────────────
function makeOpenAiCompatStrategy(
  strategyName: string,
  apiUrl: string,
  model: string,
  envKey: string,
  extraHeaders: Record<string, string> = {},
  confidence = 0.85
) {
  return class implements Strategy<AiInput, AiResult> {
    name = strategyName;
    async execute(input: AiInput): Promise<AiResult> {
      const apiKey = process.env[envKey];
      if (!apiKey) throw new Error(`${envKey} is not set.`);
      const { dbContext, sources } = await buildDbContext(input.query);
      const augmentedPrompt = buildPrompt(input.query, dbContext);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: augmentedPrompt },
          ],
          max_tokens: 1024,
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${strategyName} failed (${response.status}): ${body.slice(0, 200)}`);
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? data.output ?? data.result ?? '';
      if (!text) throw new Error(`${strategyName} returned empty response.`);
      return { response: text, confidence, sources };
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Groq — FREE tier: 14,400 req/day on llama-3.3-70b
//    Sign up: https://console.groq.com  (no credit card)
//    Env var: GROQ_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
export const GroqStrategy = makeOpenAiCompatStrategy(
  'Groq (Llama 3.3 70B)',
  'https://api.groq.com/openai/v1/chat/completions',
  'llama-3.3-70b-versatile',
  'GROQ_API_KEY',
  {},
  0.88
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Cerebras — FREE tier: very fast inference on Llama 3.3 70B
//    Sign up: https://cloud.cerebras.ai  (no credit card)
//    Env var: CEREBRAS_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
export const CerebrasStrategy = makeOpenAiCompatStrategy(
  'Cerebras (Llama 3.3 70B)',
  'https://api.cerebras.ai/v1/chat/completions',
  'llama-3.3-70b',
  'CEREBRAS_API_KEY',
  {},
  0.87
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Mistral AI — FREE tier: Mistral 7B, Mixtral 8x7B on La Plateforme
//    Sign up: https://console.mistral.ai  (no credit card, €5 free credit)
//    Env var: MISTRAL_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
export const MistralStrategy = makeOpenAiCompatStrategy(
  'Mistral (Mistral 7B)',
  'https://api.mistral.ai/v1/chat/completions',
  'mistral-small-latest',
  'MISTRAL_API_KEY',
  {},
  0.86
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Together AI — FREE: $1 credit on signup (lasts a long time on small models)
//    Sign up: https://api.together.ai  (no credit card for $1 credit)
//    Env var: TOGETHER_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
export const TogetherStrategy = makeOpenAiCompatStrategy(
  'Together AI (Llama 3 8B)',
  'https://api.together.xyz/v1/chat/completions',
  'meta-llama/Llama-3-8b-chat-hf',
  'TOGETHER_API_KEY',
  {},
  0.84
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Cohere — FREE trial tier: 1,000 API calls/month
//    Sign up: https://dashboard.cohere.com  (no credit card)
//    Env var: COHERE_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
export class CohereStrategy implements Strategy<AiInput, AiResult> {
  name = 'Cohere (Command R)';
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) throw new Error('COHERE_API_KEY is not set.');
    const { dbContext, sources } = await buildDbContext(input.query);
    const augmentedPrompt = buildPrompt(input.query, dbContext);
    // Cohere uses a different API shape (chat endpoint)
    const response = await fetch('https://api.cohere.ai/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-r',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: augmentedPrompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Cohere API failed: ${response.status}`);
    const data = await response.json();
    const text = data.message?.content?.[0]?.text ?? '';
    if (!text) throw new Error('Cohere returned empty response.');
    return { response: text, confidence: 0.84, sources };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Hugging Face Inference API — FREE: Serverless inference on many models
//    Sign up: https://huggingface.co  (free, no credit card for serverless)
//    Env var: HF_TOKEN
// ─────────────────────────────────────────────────────────────────────────────
export class HuggingFaceStrategy implements Strategy<AiInput, AiResult> {
  name = 'Hugging Face (Mistral 7B)';
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.HF_TOKEN;
    if (!apiKey) throw new Error('HF_TOKEN is not set.');
    const { dbContext, sources } = await buildDbContext(input.query);
    const augmentedPrompt = buildPrompt(input.query, dbContext);
    // HF Inference API for text generation
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistralai/Mistral-7B-Instruct-v0.3',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: augmentedPrompt },
          ],
          max_tokens: 1024,
        }),
      }
    );
    if (!response.ok) throw new Error(`Hugging Face API failed: ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Hugging Face returned empty response.');
    return { response: text, confidence: 0.82, sources };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. OpenRouter — FREE tier: access to many free models (Gemma, Llama, etc.)
//     Sign up: https://openrouter.ai  (no credit card for free models)
//     Env var: OPENROUTER_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
export const OpenRouterStrategy = makeOpenAiCompatStrategy(
  'OpenRouter (Meta Llama 3 8B)',
  'https://openrouter.ai/api/v1/chat/completions',
  'meta-llama/llama-3-8b-instruct:free',
  'OPENROUTER_API_KEY',
  {
    'HTTP-Referer': 'https://akilibrain.vercel.app',
    'X-Title': 'AkiliBrain',
  },
  0.83
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. Final fallback: clear error — never return fake AI responses
// ─────────────────────────────────────────────────────────────────────────────
export class UnavailableStrategy implements Strategy<AiInput, AiResult> {
  name = 'Unavailable';
  async execute(_input: AiInput): Promise<AiResult> {
    throw new Error('All AI services are currently at capacity. Please try again in a few minutes.');
  }
}
