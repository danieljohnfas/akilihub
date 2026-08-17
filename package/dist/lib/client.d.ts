import type { ApiResponse, StreamChunk } from '../types/api.js';
export interface ClientOptions {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    requestId?: string;
    verbose?: boolean;
    logDir?: string;
}
export declare class ZaiClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly requestId?;
    private readonly verbose;
    private readonly logDir?;
    constructor(options: ClientOptions);
    post<T>(path: string, body: object): Promise<ApiResponse<T>>;
    get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>>;
    upload<T>(path: string, file: string | Buffer, fields?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>>;
    stream(path: string, body: object): AsyncGenerator<StreamChunk>;
    private request;
    private buildUrl;
    private throwApiError;
    private logRequest;
    private logResponse;
    private logError;
    private writeLog;
    private writeVerbose;
}
