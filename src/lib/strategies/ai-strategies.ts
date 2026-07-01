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

// 1. Primary: Dify
export class DifyStrategy implements Strategy<AiInput, AiResult> {
  name = 'Dify (Primary AI Workflow)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const apiKey = process.env.DIFY_API_KEY;
    const apiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

    if (!apiKey) throw new Error('DIFY_API_KEY is not set.');

    const response = await fetch(`${apiUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: input.query,
        inputs: input.contextParams || {},
        response_mode: 'blocking',
        user: 'akilihub-system'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Dify API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      response: data.answer,
      confidence: 0.95,
      sources: data.retriever_resources?.map((r: any) => r.document_name) ?? []
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

// 3. Final fallback: clear "unavailable" error — no fake responses
export class UnavailableStrategy implements Strategy<AiInput, AiResult> {
  name = 'Unavailable';
  
  async execute(_input: AiInput): Promise<AiResult> {
    throw new Error('AI service is currently unavailable. Please try again later.');
  }
}

