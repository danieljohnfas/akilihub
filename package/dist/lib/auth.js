import { ConfigManager } from './config.js';
import { DEFAULT_CONFIG, REGION_BASE_URLS } from './constants.js';
import { AuthError, ValidationError } from './errors.js';
export { REGION_BASE_URLS };
export class AuthManager {
    config;
    constructor(config = new ConfigManager()) {
        this.config = config;
    }
    saveKey(apiKey, region) {
        const trimmed = apiKey.trim();
        if (trimmed.length === 0) {
            throw new ValidationError('API key cannot be empty');
        }
        this.config.save({ api_key: trimmed, ...(region ? { region } : {}) });
    }
    resolveKey(flagKey) {
        return firstNonEmpty(flagKey, process.env.ZAI_API_KEY, this.config.load().api_key);
    }
    resolveRegion(flagRegion) {
        const value = firstNonEmpty(flagRegion, process.env.ZAI_REGION, this.config.load().region) ?? DEFAULT_CONFIG.region;
        if (value === 'global' || value === 'china') {
            return value;
        }
        throw new ValidationError(`Invalid region: ${value}. Expected global or china.`);
    }
    getBaseUrl(region) {
        return REGION_BASE_URLS[region];
    }
    resolveBaseUrl(region) {
        const envBaseUrl = firstNonEmpty(process.env.ZAI_BASE_URL);
        if (envBaseUrl) {
            return envBaseUrl;
        }
        if (firstNonEmpty(process.env.ZAI_REGION)) {
            return this.getBaseUrl(region);
        }
        return firstNonEmpty(this.config.getBaseUrlOverride(), this.getBaseUrl(region));
    }
    async validate(apiKey, region = this.resolveRegion()) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
            const response = await fetch(`${this.resolveBaseUrl(region)}/models`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: controller.signal
            });
            if (response.ok) {
                return { valid: true };
            }
            return { valid: false, error: `${response.status} ${response.statusText}`.trim() };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { valid: false, error: message };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    requireKey(flagKey) {
        const apiKey = this.resolveKey(flagKey);
        if (!apiKey) {
            throw new AuthError('No API key configured. Use --api-key, set ZAI_API_KEY, or run zai-cli auth set <key> --region china.');
        }
        return apiKey;
    }
    revoke() {
        this.config.save({ api_key: undefined });
    }
}
export function maskApiKey(apiKey) {
    if (!apiKey) {
        return undefined;
    }
    if (apiKey.length <= 8) {
        return '****';
    }
    return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
}
function firstNonEmpty(...values) {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0);
}
//# sourceMappingURL=auth.js.map