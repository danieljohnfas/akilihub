import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { maskApiKey } from './auth.js';
import { ApiError, NetworkError } from './errors.js';
import { writeCallLog } from '../utils/logger.js';
export class ZaiClient {
    apiKey;
    baseUrl;
    timeout;
    requestId;
    verbose;
    logDir;
    constructor(options) {
        this.apiKey = options.apiKey;
        this.baseUrl = options.baseUrl.replace(/\/+$/, '');
        this.timeout = options.timeout;
        this.requestId = options.requestId;
        this.verbose = options.verbose ?? false;
        this.logDir = options.logDir;
    }
    async post(path, body) {
        return this.request({
            method: 'POST',
            path,
            body,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    async get(path, params) {
        return this.request({ method: 'GET', path, params });
    }
    async upload(path, file, fields = {}) {
        const form = new FormData();
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                form.append(key, String(value));
            }
        }
        if (typeof file === 'string') {
            const buffer = await readFile(file);
            form.append('file', new Blob([new Uint8Array(buffer)]), basename(file));
        }
        else {
            form.append('file', new Blob([new Uint8Array(file)]), 'file');
        }
        return this.request({
            method: 'POST',
            path,
            body: form
        });
    }
    async *stream(path, body) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeout);
        const url = this.buildUrl(path);
        this.logRequest('POST', url, body);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept-Language': 'en-US,en',
                    'x-source-channel': 'zai-cli',
                    ...(this.requestId ? { 'X-Request-Id': this.requestId } : {})
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            if (!response.ok) {
                await this.throwApiError(response);
            }
            this.logResponse(response.status, { stream: true });
            if (!response.body) {
                throw new NetworkError('Streaming response body is empty');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) {
                        continue;
                    }
                    const payload = trimmed.slice(5).trim();
                    if (payload === '[DONE]') {
                        return;
                    }
                    try {
                        yield JSON.parse(payload);
                    }
                    catch {
                        // Skip malformed chunks instead of failing the entire stream
                        this.logError(new Error(`Failed to parse streaming chunk: ${payload}`));
                    }
                }
            }
        }
        catch (error) {
            if (error instanceof ApiError || error instanceof NetworkError) {
                throw error;
            }
            this.logError(error);
            throw new NetworkError(error instanceof Error ? error.message : String(error), { cause: error });
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async request(options) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeout);
        const url = this.buildUrl(options.path, options.params);
        try {
            const init = {
                method: options.method,
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Accept-Language': 'en-US,en',
                    'x-source-channel': 'zai-cli',
                    ...(this.requestId ? { 'X-Request-Id': this.requestId } : {}),
                    ...options.headers
                },
                signal: controller.signal
            };
            if (options.body instanceof FormData) {
                init.body = options.body;
            }
            else if (options.body !== undefined) {
                init.body = JSON.stringify(options.body);
            }
            this.logRequest(options.method, url, options.body);
            const response = await fetch(url, init);
            if (!response.ok) {
                await this.throwApiError(response);
            }
            const data = (await readJsonOrText(response));
            this.logResponse(response.status, data);
            return {
                data,
                requestId: response.headers.get('x-request-id') ?? readRequestId(data),
                status: response.status
            };
        }
        catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            this.logError(error);
            throw new NetworkError(error instanceof Error ? error.message : String(error), { cause: error });
        }
        finally {
            clearTimeout(timeout);
        }
    }
    buildUrl(path, params) {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const url = new URL(`${this.baseUrl}${normalizedPath}`);
        for (const [key, value] of Object.entries(params ?? {})) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }
        return url.toString();
    }
    async throwApiError(response) {
        const body = await readJsonOrText(response);
        this.logResponse(response.status, body);
        const requestId = response.headers.get('x-request-id') ?? readRequestId(body);
        const apiError = readApiError(body);
        throw new ApiError(apiError.message ?? `${response.status} ${response.statusText}`.trim(), {
            code: apiError.code ?? 'api_error',
            statusCode: response.status,
            requestId,
            responseBody: body
        });
    }
    logRequest(method, url, body) {
        this.writeLog(`[zai-cli] request ${method} ${url}`);
        this.writeVerbose(`[zai-cli] request ${method} ${url} Authorization=Bearer ${maskApiKey(this.apiKey)} body=${safeJsonStringify(redactValue(body))}`);
    }
    logResponse(status, body) {
        this.writeLog(`[zai-cli] response status=${status}`);
        this.writeVerbose(`[zai-cli] response status=${status} body=${safeJsonStringify(redactValue(body))}`);
    }
    logError(error) {
        const message = error instanceof Error ? error.message : String(error);
        const log = `[zai-cli] error message=${safeJsonStringify(message)}`;
        this.writeLog(log);
        this.writeVerbose(log);
    }
    writeLog(message) {
        writeCallLog(message, { logDir: this.logDir });
    }
    writeVerbose(message) {
        if (this.verbose) {
            process.stderr.write(`${message}\n`);
        }
    }
}
async function readJsonOrText(response) {
    const text = await response.text();
    if (text.trim() === '') {
        return {};
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
function readRequestId(value) {
    if (isRecord(value)) {
        const requestId = value.request_id ?? value.requestId ?? value.id;
        return typeof requestId === 'string' ? requestId : '';
    }
    return '';
}
function readApiError(value) {
    if (!isRecord(value)) {
        return { message: typeof value === 'string' ? value : undefined };
    }
    const error = value.error;
    if (isRecord(error)) {
        return {
            code: asString(error.code),
            message: asString(error.message) ?? asString(error.msg)
        };
    }
    return {
        code: asString(value.code),
        message: asString(value.message) ?? asString(value.msg)
    };
}
function redactValue(value) {
    if (Array.isArray(value)) {
        return value.map(redactValue);
    }
    if (typeof value === 'string' && value.startsWith('data:')) {
        return '[data URL omitted]';
    }
    if (!isRecord(value)) {
        return value;
    }
    return Object.fromEntries(Object.entries(value).map(([key, val]) => {
        if (/api[-_]?key|authorization|password|secret|token/i.test(key)) {
            return [key, maskApiKey(String(val))];
        }
        return [key, redactValue(val)];
    }));
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asString(value) {
    return typeof value === 'string' ? value : undefined;
}
function safeJsonStringify(value) {
    try {
        return JSON.stringify(value) ?? String(value);
    }
    catch {
        return '"[unserializable]"';
    }
}
//# sourceMappingURL=client.js.map