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
        user: 'akilihub-system'
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

// 3. Final fallback: clear "unavailable" error — no fake responses
export class UnavailableStrategy implements Strategy<AiInput, AiResult> {
  name = 'Unavailable';
  
  async execute(_input: AiInput): Promise<AiResult> {
    throw new Error('AI service is currently unavailable. Please try again later.');
  }
}

