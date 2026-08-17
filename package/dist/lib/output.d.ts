import type { OutputFormat } from '../types/config.js';
export declare function formatOutput(data: unknown, format: OutputFormat): string;
export declare function writeOutput(data: unknown, format: OutputFormat): void;
export declare function writeError(error: unknown): void;
