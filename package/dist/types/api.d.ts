export interface TokenUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    [key: string]: unknown;
}
export interface ApiResponse<T = unknown> {
    data: T;
    requestId: string;
    status: number;
}
export interface StreamChunk {
    id?: string;
    model?: string;
    choices?: Array<{
        delta?: {
            content?: string;
            reasoning_content?: string;
            tool_calls?: unknown;
        };
        finish_reason?: string | null;
        index?: number;
    }>;
    usage?: TokenUsage;
    [key: string]: unknown;
}
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | Array<Record<string, unknown>>;
    tool_call_id?: string;
    name?: string;
}
export interface ChatCompletionResponse {
    id?: string;
    request_id?: string;
    model?: string;
    choices?: Array<{
        message?: {
            content?: string;
            reasoning_content?: string;
            tool_calls?: unknown[];
            role?: string;
        };
        finish_reason?: string;
        index?: number;
    }>;
    usage?: TokenUsage;
    [key: string]: unknown;
}
export interface ImageGenerationResponse {
    id?: string;
    request_id?: string;
    created?: number;
    model?: string;
    data?: Array<{
        url?: string;
        b64_json?: string;
        revised_prompt?: string;
    }>;
    results?: Array<{
        url?: string;
        b64_json?: string;
        revised_prompt?: string;
    }>;
    usage?: TokenUsage;
    [key: string]: unknown;
}
export interface VideoGenerationResponse {
    id?: string;
    task_id?: string;
    request_id?: string;
    model?: string;
    task_status?: string;
    [key: string]: unknown;
}
export interface VideoTaskResponse {
    id?: string;
    task_id?: string;
    request_id?: string;
    model?: string;
    task_status?: string;
    video_result?: Array<{
        url?: string;
        cover_image_url?: string;
    }>;
    [key: string]: unknown;
}
