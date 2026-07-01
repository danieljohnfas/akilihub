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

// 3. Fallback: Vercel AI SDK (Direct Gemini connection)
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export class VercelAiSdkStrategy implements Strategy<AiInput, AiResult> {
  name = 'Vercel AI SDK (Gemini Fallback)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set.');

    // Note: The google provider from @ai-sdk/google automatically uses GOOGLE_GENERATIVE_AI_API_KEY
    const { text } = await generateText({
      model: google('models/gemini-1.5-flash'),
      prompt: `You are AkiliBrain's AI assistant for East Africa. Help users with tenders, business compliance, health data, and salary information.\n\nUser: ${input.query}`,
    });

    return {
      response: text,
      confidence: 0.90,
      sources: []
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

