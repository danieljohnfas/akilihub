import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, DEFAULT_CONFIG, REGION_BASE_URLS } from './constants.js';
import { ValidationError } from './errors.js';
export class ConfigManager {
    static CONFIG_FILE = `~/${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`;
    configFile;
    constructor(configFile = process.env.ZAI_CONFIG_FILE ?? join(homedir(), CONFIG_DIR_NAME, CONFIG_FILE_NAME)) {
        this.configFile = configFile;
    }
    get path() {
        return this.configFile;
    }
    load() {
        const overrides = this.loadOverrides();
        const merged = { ...DEFAULT_CONFIG, ...overrides };
        merged.base_url = overrides.base_url ?? REGION_BASE_URLS[merged.region];
        validateConfig(merged);
        return merged;
    }
    getBaseUrlOverride() {
        return this.loadOverrides().base_url;
    }
    save(config) {
        const next = { ...this.loadOverrides(), ...config };
        if (config.region !== undefined && config.base_url === undefined) {
            delete next.base_url;
        }
        const region = next.region ?? DEFAULT_CONFIG.region;
        validateConfig({
            ...DEFAULT_CONFIG,
            ...next,
            base_url: next.base_url ?? REGION_BASE_URLS[region]
        });
        const toSave = Object.fromEntries(Object.entries(next).filter(([key, value]) => {
            if (value === undefined) {
                return false;
            }
            if (key === 'base_url') {
                return value !== REGION_BASE_URLS[region];
            }
            return value !== DEFAULT_CONFIG[key];
        }));
        // If no custom values, delete the config file
        if (Object.keys(toSave).length === 0) {
            if (existsSync(this.configFile)) {
                rmSync(this.configFile);
            }
            return;
        }
        mkdirSync(dirname(this.configFile), { recursive: true, mode: 0o700 });
        writeFileSync(this.configFile, `${JSON.stringify(toSave, null, 2)}\n`, { mode: 0o600 });
        chmodSync(this.configFile, 0o600);
    }
    loadOverrides() {
        if (!existsSync(this.configFile)) {
            return {};
        }
        const raw = readFileSync(this.configFile, 'utf8');
        if (raw.trim() === '') {
            return {};
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (error) {
            throw new ValidationError(`Invalid config JSON at ${this.configFile}`, { cause: error });
        }
        if (!isRecord(parsed)) {
            throw new ValidationError(`Config file must contain a JSON object: ${this.configFile}`);
        }
        const overrides = parsed;
        const region = overrides.region ?? DEFAULT_CONFIG.region;
        if (overrides.base_url === REGION_BASE_URLS[region]) {
            delete overrides.base_url;
        }
        return overrides;
    }
    get(key) {
        return this.load()[key];
    }
    set(key, value) {
        this.save({ [key]: value });
    }
    list() {
        return this.load();
    }
    reset() {
        if (existsSync(this.configFile)) {
            rmSync(this.configFile);
        }
    }
}
export function parseConfigValue(key, value) {
    if (!isConfigKey(key)) {
        throw new ValidationError(`Unknown config key: ${key}`);
    }
    switch (key) {
        case 'timeout':
            return { timeout: parseInteger(value, key) };
        case 'region':
            return { region: parseRegion(value) };
        case 'output_format':
            return { output_format: parseOutputFormatValue(value) };
        case 'api_key':
            if (value.trim().length === 0) {
                throw new ValidationError('API key cannot be empty');
            }
            return { api_key: value.trim() };
        case 'base_url':
            validateBaseUrl(value);
            return { base_url: value };
        case 'default_chat_model':
        case 'default_multimodal_model':
        case 'default_image_model':
        case 'default_video_model':
        case 'default_audio_model':
        case 'default_ocr_model':
        case 'default_web_search_engine':
            return { [key]: value };
        default:
            throw new ValidationError(`Unsupported config key: ${key}`);
    }
}
export function isConfigKey(key) {
    return key in DEFAULT_CONFIG || key === 'api_key';
}
function validateConfig(config) {
    parseRegion(config.region);
    parseOutputFormatValue(config.output_format);
    if (!Number.isInteger(config.timeout) || config.timeout <= 0) {
        throw new ValidationError('Config timeout must be a positive integer');
    }
    validateBaseUrl(config.base_url);
}
function validateBaseUrl(value) {
    try {
        const baseUrl = new URL(value);
        if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
            throw new Error('unsupported protocol');
        }
    }
    catch (error) {
        throw new ValidationError(`Invalid base_url: ${value}`, { cause: error });
    }
}
function parseRegion(value) {
    if (value === 'global' || value === 'china') {
        return value;
    }
    throw new ValidationError(`Invalid region: ${value}. Expected global or china.`);
}
function parseOutputFormatValue(value) {
    if (value === 'json' || value === 'text' || value === 'table') {
        return value;
    }
    throw new ValidationError(`Invalid output format: ${value}. Expected json, text, or table.`);
}
function parseInteger(value, key) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ValidationError(`${key} must be a positive integer`);
    }
    return parsed;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=config.js.map