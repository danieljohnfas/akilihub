import type { ConfigKey, ZaiConfig } from '../types/config.js';
export declare class ConfigManager {
    static readonly CONFIG_FILE = "~/.zai/zai-cli/config.json";
    private readonly configFile;
    constructor(configFile?: string);
    get path(): string;
    load(): ZaiConfig;
    getBaseUrlOverride(): string | undefined;
    save(config: Partial<ZaiConfig>): void;
    private loadOverrides;
    get<K extends ConfigKey>(key: K): ZaiConfig[K];
    set<K extends ConfigKey>(key: K, value: ZaiConfig[K]): void;
    list(): ZaiConfig;
    reset(): void;
}
export declare function parseConfigValue(key: string, value: string): Partial<ZaiConfig>;
export declare function isConfigKey(key: string): key is ConfigKey;
