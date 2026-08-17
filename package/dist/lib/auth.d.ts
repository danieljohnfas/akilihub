import { ConfigManager } from './config.js';
import { REGION_BASE_URLS } from './constants.js';
import type { Region } from '../types/config.js';
export { REGION_BASE_URLS };
export type { Region };
export declare class AuthManager {
    private readonly config;
    constructor(config?: ConfigManager);
    saveKey(apiKey: string, region?: Region): void;
    resolveKey(flagKey?: string): string | undefined;
    resolveRegion(flagRegion?: Region): Region;
    getBaseUrl(region: Region): string;
    resolveBaseUrl(region: Region): string;
    validate(apiKey: string, region?: Region): Promise<{
        valid: boolean;
        error?: string;
    }>;
    requireKey(flagKey?: string): string;
    revoke(): void;
}
export declare function maskApiKey(apiKey?: string): string | undefined;
