import type { Region } from '../types/config.js';
import type { CommandContext } from './common.js';
interface RegionOption {
    value: Region;
    label: string;
    detail: string;
    description: string;
    apiKeyUrl: string;
}
export declare const REGION_OPTIONS: readonly RegionOption[];
export declare function resolveRegionChoice(value: string | undefined): Region | undefined;
export declare function runInteractiveLogin(context: CommandContext): Promise<{
    ok: true;
    region: Region;
    config_file: string;
}>;
export {};
