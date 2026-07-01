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

// 3. Final fallback: Contextual mock for offline/dev mode
export class MockAiStrategy implements Strategy<AiInput, AiResult> {
  name = 'Mock AI (Development Fallback)';
  
  async execute(input: AiInput): Promise<AiResult> {
    const q = input.query.toLowerCase();
    
    let response = "I'm AkiliHub's AI assistant. I can help you explore tenders, business registrations, health data, and salaries across East Africa. Try asking about specific tenders or registered companies!";

    if (q.includes('tender') || q.includes('procurement') || q.includes('bid')) {
      response = "I can help with East African procurement intelligence. Our database tracks active tenders from PPRA Tanzania, PPOA Kenya, and PPDA Uganda. Try searching the **Tenders** directory for specific categories like IT, Construction, or Consultancy.";
    } else if (q.includes('business') || q.includes('compan') || q.includes('registr') || q.includes('brela')) {
      response = "Our Business Registry indexes companies registered with BRELA in Tanzania and equivalent bodies. You can search by company name or registration number in the **Compliance** section.";
    } else if (q.includes('health') || q.includes('indicator') || q.includes('disease') || q.includes('dhis')) {
      response = "We track key public health indicators across East Africa sourced from DHIS2 and WHO datasets. Explore the **Health** section to filter by category (maternal, infectious, child health) and country.";
    } else if (q.includes('salary') || q.includes('pay') || q.includes('wage') || q.includes('earn')) {
      response = "Our Salary Database covers public and private sector pay across the region. You can filter by experience level (Entry, Mid, Senior, Executive) and job title in the **Salaries** section.";
    }
    
    return { response, confidence: 0.7, sources: [] };
  }
}
