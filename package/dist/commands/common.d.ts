import { Command } from 'commander';
import { AuthManager } from '../lib/auth.js';
import { ConfigManager } from '../lib/config.js';
import { ZaiClient } from '../lib/client.js';
import type { GlobalOptions } from '../types/cli.js';
import type { OutputFormat, Region, ZaiConfig } from '../types/config.js';
export interface CommandContext {
    globalOptions: GlobalOptions;
    configManager: ConfigManager;
    config: ZaiConfig;
    auth: AuthManager;
    outputFormat: OutputFormat;
    timeout: number;
    region: Region;
    baseUrl: string;
    client?: ZaiClient;
}
export declare function addGlobalOptions(command: Command): Command;
export declare function addHelpOnMissingArgs(command: Command): Command;
export declare function createCommandContext(command: Command, options?: {
    requireAuth?: boolean;
    useCoding?: boolean;
}): CommandContext;
export declare function requireClient(context: CommandContext): ZaiClient;
export declare function resolveModel(context: CommandContext, defaultModel: string): string;
