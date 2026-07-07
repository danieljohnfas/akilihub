import { Strategy } from './engine';

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

// 1. Primary: Dify (Workflow App)
export class DifyStrategy implements Strategy<AiInput, AiResult> {
  name = 'Dify (Primary AI Workflow)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.DIFY_API_KEY;
    const apiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    // The name of the input variable in your Dify workflow — set via DIFY_INPUT_VAR env var
    const inputVar = process.env.DIFY_INPUT_VAR || 'query';

    if (!apiKey) throw new Error('DIFY_API_KEY is not set.');

    const response = await fetch(`${apiUrl}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: { [inputVar]: input.query, ...input.contextParams },
        response_mode: 'blocking',
        user: 'akilibrain-system'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Dify API failed with status: ${response.status}`);
    }
    
    const data = await response.json();

    if (data.data?.status !== 'succeeded') {
      throw new Error(`Dify workflow did not succeed: ${data.data?.error ?? data.data?.status}`);
    }

    // Extract text output — look for 'text', 'answer', or 'output', then fall back to first string value
    const outputs = data.data?.outputs ?? {};
    const text: string =
      outputs.text ?? outputs.answer ?? outputs.output ??
      Object.values(outputs).find((v): v is string => typeof v === 'string') ??
      'No response from workflow.';

    return {
      response: text,
      confidence: 0.95,
      sources: [],
    };
  }
}


// 2. Fallback: Langflow
export class LangflowStrategy implements Strategy<AiInput, AiResult> {
  name = 'Langflow (Fallback AI Workflow)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const apiUrl = process.env.LANGFLOW_API_URL || 'http://localhost:7860';
    const flowId = process.env.LANGFLOW_FLOW_ID;

    if (!flowId) throw new Error('LANGFLOW_FLOW_ID is not set.');

    const response = await fetch(`${apiUrl}/api/v1/run/${flowId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_value: input.query,
        output_type: 'chat',
        input_type: 'chat',
      })
    });
    
    if (!response.ok) {
      throw new Error(`Langflow API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ?? 'Processed by Langflow';
    return {
      response: text,
      confidence: 0.85,
      sources: []
    };
  }
}

import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { db } from '../db/client';
import { tenders } from '../db/schema/tenders';
import { businesses } from '../db/schema/compliance';
import { jobs } from '../db/schema/jobs';
import { ilike, desc, and, eq, or, isNull, gt } from 'drizzle-orm';

export class VercelAiSdkStrategy implements Strategy<AiInput, AiResult> {
  name = 'Vercel AI SDK (Gemini Fallback)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set.');

    const systemPrompt = `You are AkiliBrain's intelligent AI assistant for East Africa (Kenya, Tanzania, Uganda, Rwanda, Ethiopia, Congo DRC).

You help users with:
- Finding government tenders and procurement opportunities
- Business registration and compliance (TRA, KRA, BRELA)
- Health data and indicators across East Africa
- Salary benchmarks and career information
- **Job matching**: If a user shares their CV or skills, use the searchJobs tool to find the best matching jobs in our database and present them clearly with company name, location, and a link.

When a user shares CV content or asks for job matching:
1. Extract their key skills, experience, and job preferences from the text.
2. Use searchJobs with relevant keywords.
3. Present the top matches clearly with: Job Title, Company (Recruiting), Location, and a link to /jobs/[id].
4. If no matches are found, say so clearly and suggest they check back as new jobs are added daily.

Always be concise, helpful, and specific to East Africa context.`;

    const toolsConfig = {
        searchTenders: {
          description: 'Search for active government tenders in East Africa.',
          parameters: z.object({
            keyword: z.string().describe('Search term, e.g., IT, construction, health.'),
          }),
          execute: async (args: any) => {
            const keyword = args.keyword as string;
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
              .limit(5);
            return results.length > 0 ? JSON.stringify(results) : 'No tenders found for that keyword.';
          },
        } as any,
        searchBusinesses: {
          description: 'Check business registration and compliance status.',
          parameters: z.object({
            companyName: z.string().describe('Company name to search.'),
          }),
          execute: async (args: any) => {
            const companyName = args.companyName as string;
            const results = await db.select()
              .from(businesses)
              .where(ilike(businesses.name, `%${companyName}%`))
              .limit(3);
            return results.length > 0 ? JSON.stringify(results) : 'No business records found.';
          },
        } as any,
        searchJobs: {
          description: 'Search for active job openings in East Africa. Use this when a user shares their CV or asks for job matching.',
          parameters: z.object({
            keyword: z.string().describe('Job title, skill, or keyword to search, e.g., software engineer, accountant, NGO.'),
            location: z.string().optional().describe('Optional location filter, e.g., Nairobi, Dar es Salaam.'),
          }),
          execute: async (args: any) => {
            const keyword = args.keyword as string;
            const location = args.location as string | undefined;
            const activeFilter = and(
              eq(jobs.isActive, true),
              or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
            );
            const results = await db.select({
              id: jobs.id,
              title: jobs.title,
              companyName: jobs.companyName,
              location: jobs.location,
              jobType: jobs.jobType,
              deadline: jobs.deadline,
            })
              .from(jobs)
              .where(and(
                activeFilter,
                ilike(jobs.title, `%${keyword}%`),
                ...(location ? [ilike(jobs.location, `%${location}%`)] : [])
              ))
              .orderBy(desc(jobs.createdAt))
              .limit(8);
            if (results.length === 0) {
              return `No active jobs found matching "${keyword}"${location ? ` in ${location}` : ''}. New jobs are added daily — check back tomorrow.`;
            }
            return JSON.stringify(results.map(j => ({
              ...j,
              link: `/jobs/${j.id}`,
            })));
          },
        } as any,
    };

    let finalResponse = '';
    let sources: string[] = [];

    const { text, toolCalls, toolResults } = await generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: input.query,
      tools: toolsConfig,
    });

    if (toolCalls && toolCalls.length > 0 && toolResults) {
      sources = ['AkiliBrain Database'];
      // Perform a second call to synthesize the tool results
      const followup = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        messages: [
          { role: 'user', content: input.query },
          { role: 'assistant', content: text || '', toolCalls },
          { role: 'tool', content: toolResults.map((tr: any) => ({
            type: 'tool-result',
            toolCallId: tr.toolCallId,
            toolName: tr.toolName,
            result: tr.result,
          })) as any }
        ] as any,
      });
      finalResponse = followup.text;
    } else {
      finalResponse = text;
    }

    return {
      response: finalResponse,
      confidence: 0.90,
      sources,
    };
  }
}

// 4. Fallback: Groq (Ultra-fast open source models)
export class GroqStrategy implements Strategy<AiInput, AiResult> {
  name = 'Groq (Llama 3 Fallback)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set.');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You are AkiliBrain\'s AI assistant for East Africa. Help users with tenders, business compliance, health data, and salary information.' },
          { role: 'user', content: input.query }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      response: data.choices[0]?.message?.content ?? 'Processed by Groq',
      confidence: 0.85,
      sources: []
    };
  }
}

// 5. Fallback: OpenRouter (Unified API, Free Tier Models)
export class OpenRouterStrategy implements Strategy<AiInput, AiResult> {
  name = 'OpenRouter (Gemma 2 Fallback)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set.');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://akilibrain.vercel.app',
        'X-Title': 'AkiliBrain',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Using a high-quality free model on OpenRouter
        model: 'google/gemma-2-9b-it:free',
        messages: [
          { role: 'system', content: 'You are AkiliBrain\'s AI assistant for East Africa. Help users with tenders, business compliance, health data, and salary information.' },
          { role: 'user', content: input.query }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      response: data.choices[0]?.message?.content ?? 'Processed by OpenRouter',
      confidence: 0.85,
      sources: []
    };
  }
}

// 6. Final fallback: clear "unavailable" error — no fake responses
export class UnavailableStrategy implements Strategy<AiInput, AiResult> {
  name = 'Unavailable';
  
  async execute(_input: AiInput): Promise<AiResult> {
    throw new Error('AI service is currently unavailable. Please try again later.');
  }
}

