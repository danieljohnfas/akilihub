import { existsSync, statSync } from 'node:fs';
import { ValidationError } from '../lib/errors.js';
export function parseOutputFormat(value) {
    if (value === undefined || value === null || value === '') {
        return 'json';
    }
    if (value === 'json' || value === 'text' || value === 'table') {
        return value;
    }
    throw new ValidationError(`Invalid output format: ${String(value)}. Expected json, text, or table.`);
}
export function parseRegion(value) {
    if (value === 'global' || value === 'china') {
        return value;
    }
    throw new ValidationError(`Invalid region: ${value}. Expected global or china.`);
}
export function parsePositiveInteger(value, name) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ValidationError(`${name} must be a positive integer`);
    }
    return parsed;
}
export function parseBoolean(value, name) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    throw new ValidationError(`${name} must be true or false`);
}
export function parseJsonArray(value, name) {
    if (value === undefined) {
        return undefined;
    }
    let parsed;
    try {
        parsed = JSON.parse(value);
    }
    catch (error) {
        throw new ValidationError(`${name} must be valid JSON`, { cause: error });
    }
    if (!Array.isArray(parsed)) {
        throw new ValidationError(`${name} must be a JSON array`);
    }
    return parsed;
}
export function ensureFileExists(filePath) {
    if (!existsSync(filePath)) {
        throw new ValidationError(`File does not exist: ${filePath}`);
    }
    if (!statSync(filePath).isFile()) {
        throw new ValidationError(`Path is not a file: ${filePath}`);
    }
}
export function requireValue(value, message) {
    if (!value || value.trim().length === 0) {
        throw new ValidationError(message);
    }
    return value;
}
export function parseUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('unsupported protocol');
        }
        return value;
    }
    catch (error) {
        throw new ValidationError(`Invalid URL: ${value}`, { cause: error });
    }
}
export function validateFileSize(filePath, maxSizeMB) {
    const stats = statSync(filePath);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (stats.size > maxSizeBytes) {
        throw new ValidationError(`File size exceeds ${maxSizeMB}MB limit: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    }
}
//# sourceMappingURL=validators.js.map