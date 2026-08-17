import type { OutputFormat } from './config.js';
export interface GlobalOptions {
    model?: string;
    output?: OutputFormat | string;
    stream?: boolean;
    verbose?: boolean;
    apiKey?: string;
    timeout?: string | number;
    requestId?: string;
}
