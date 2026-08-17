import { AuthManager } from '../lib/auth.js';
import { ConfigManager } from '../lib/config.js';
import { ZaiClient } from '../lib/client.js';
import { ValidationError } from '../lib/errors.js';
import { parseOutputFormat, parsePositiveInteger } from '../utils/validators.js';
export function addGlobalOptions(command) {
    return command
        .option('-m, --model <model>', 'Override default model')
        .option('--output <format>', 'Output format: json (default), text, table')
        .option('--stream', 'Stream output (chat only)')
        .option('--verbose', 'Show HTTP request/response details')
        .option('--api-key <key>', 'Override API key')
        .option('--timeout <ms>', 'Request timeout in ms')
        .option('--request-id <id>', 'Client request id for idempotency/debugging');
}
export function addHelpOnMissingArgs(command) {
    command.exitOverride();
    return command;
}
export function createCommandContext(command, options = {}) {
    const requireAuth = options.requireAuth ?? true;
    const globalOptions = command.optsWithGlobals();
    const configManager = new ConfigManager();
    const config = configManager.load();
    const auth = new AuthManager(configManager);
    const outputFormat = parseOutputFormat(globalOptions.output ?? process.env.ZAI_OUTPUT_FORMAT ?? config.output_format);
    const timeout = resolveTimeout(globalOptions, config);
    const region = auth.resolveRegion();
    let baseUrl = auth.resolveBaseUrl(region);
    if (options.useCoding) {
        baseUrl = baseUrl.replace('/api/paas/v4', '/api/coding/paas/v4');
    }
    const apiKey = requireAuth ? auth.requireKey(globalOptions.apiKey) : auth.resolveKey(globalOptions.apiKey);
    const client = apiKey
        ? new ZaiClient({
            apiKey,
            baseUrl,
            timeout,
            requestId: globalOptions.requestId,
            verbose: globalOptions.verbose
        })
        : undefined;
    return {
        globalOptions,
        configManager,
        config,
        auth,
        outputFormat,
        timeout,
        region,
        baseUrl,
        client
    };
}
export function requireClient(context) {
    if (!context.client) {
        throw new ValidationError('Authenticated client is not available');
    }
    return context.client;
}
export function resolveModel(context, defaultModel) {
    return context.globalOptions.model ?? process.env.ZAI_DEFAULT_MODEL ?? defaultModel;
}
function resolveTimeout(globalOptions, config) {
    if (globalOptions.timeout !== undefined) {
        return parsePositiveInteger(globalOptions.timeout, 'timeout');
    }
    if (process.env.ZAI_TIMEOUT) {
        return parsePositiveInteger(process.env.ZAI_TIMEOUT, 'ZAI_TIMEOUT');
    }
    return config.timeout;
}
//# sourceMappingURL=common.js.map