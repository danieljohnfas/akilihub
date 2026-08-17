import { Command } from 'commander';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext, requireClient } from './common.js';
import { writeOutput } from '../lib/output.js';
import { withProgress } from '../utils/logger.js';
import { parseBoolean, parsePositiveInteger, parseUrl } from '../utils/validators.js';
export function createWebReadCommand() {
    const command = addHelpOnMissingArgs(addGlobalOptions(new Command('web-read')))
        .description('Extract content from a webpage')
        .argument('<url>', 'URL of the webpage to read')
        .option('--format <format>', 'Return format: markdown or text', 'markdown')
        .option('--timeout-seconds <seconds>', 'Reader timeout in seconds', '20')
        .option('--no-cache', 'Disable reader cache')
        .option('--retain-images <true|false>', 'Retain images in returned content', 'true')
        .option('--with-images-summary', 'Include image summaries when supported')
        .option('--with-links-summary', 'Include link summaries when supported')
        .addHelpText('after', `
Examples:
  zai-cli web-read "https://example.com/article"
  zai-cli web-read "https://example.com/article" --format text --output text`);
    command.action(async (url) => {
        const options = command.opts();
        const context = createCommandContext(command);
        const client = requireClient(context);
        const body = {
            url: parseUrl(url),
            return_format: options.format ?? 'markdown',
            timeout: parsePositiveInteger(options.timeoutSeconds ?? '20', 'timeout-seconds'),
            no_cache: Boolean(options.noCache),
            retain_images: parseBoolean(options.retainImages ?? 'true', 'retain-images'),
            with_images_summary: Boolean(options.withImagesSummary),
            with_links_summary: Boolean(options.withLinksSummary)
        };
        if (context.globalOptions.requestId) {
            body.request_id = context.globalOptions.requestId;
        }
        const response = await withProgress('Reading webpage', () => client.post('/reader', body));
        writeOutput(response.data, context.outputFormat);
    });
    return command;
}
//# sourceMappingURL=web-read.js.map