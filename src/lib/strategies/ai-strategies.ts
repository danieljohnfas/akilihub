import { Strategy } from './engine';

export interface AiInput {
  query: string;
  contextParams?: Record<string, any>;
}

export interface AiResult {
  response: string;
  confidence: number;
  sources: string[];
}

// 1. Primary: Dify
export class DifyStrategy implements Strategy<AiInput, AiResult> {
  name = 'Dify (Primary AI Workflow)';
  
  async execute(input: AiInput): Promise<AiResult> {
    // Call Dify completion API
    const response = await fetch('http://localhost:5001/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer DIFY_API_KEY_PLACEHOLDER`,
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
      sources: []
    };
  }
}

// 2. Fallback: Langflow
export class LangflowStrategy implements Strategy<AiInput, AiResult> {
  name = 'Langflow (Fallback AI Workflow)';
  
  async execute(input: AiInput): Promise<AiResult> {
    // Call Langflow API
    const response = await fetch('http://localhost:7860/api/v1/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: { text: input.query },
        flow_id: "LANGFLOW_FLOW_ID_PLACEHOLDER"
      })
    });
    
    if (!response.ok) {
      throw new Error(`Langflow API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      response: data.result.text || "Processed by Langflow",
      confidence: 0.85,
      sources: []
    };
  }
}
