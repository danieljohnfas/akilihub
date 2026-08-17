import { Command } from 'commander';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext, requireClient, resolveModel } from './common.js';
import { writeOutput } from '../lib/output.js';
import { ValidationError } from '../lib/errors.js';
import { withProgress } from '../utils/logger.js';
import { parsePositiveInteger } from '../utils/validators.js';
export function createWebSearchCommand() {
    const command = addHelpOnMissingArgs(addGlobalOptions(new Command('web-search')))
        .description('Search the web and return structured results')
        .argument('<query>', 'Search query string')
        .option('--count <count>', 'Number of results to return, 1-50', '10')
        .option('--domain <domain>', 'Restrict search results to a domain')
        .option('--recency <filter>', 'oneDay, oneWeek, oneMonth, oneYear, or noLimit', 'noLimit')
        .option('--user-id <id>', 'End user id for abuse monitoring')
        .addHelpText('after', `
Examples:
  zai-cli web-search "latest AI research 2024"
  zai-cli web-search "北京今天天气" | zai-cli chat --system "summarize in one sentence"`);
    command.action(async (query) => {
        const options = command.opts();
        const context = createCommandContext(command);
        const client = requireClient(context);
        const count = parsePositiveInteger(options.count ?? '10', 'count');
        const body = {
            search_engine: resolveModel(context, context.config.default_web_search_engine),
            search_query: query,
            count,
            search_recency_filter: options.recency ?? 'noLimit'
        };
        if (count > 50) {
            throw new ValidationError('count must be less than or equal to 50');
        }
        if (options.domain) {
            body.search_domain_filter = options.domain;
        }
        if (options.userId) {
            body.user_id = options.userId;
        }
        if (context.globalOptions.requestId) {
            body.request_id = context.globalOptions.requestId;
        }
        const response = await withProgress('Searching web', () => client.post('/web_search', body));
        writeOutput(response.data, context.outputFormat);
    });
    return command;
}
//# sourceMappingURL=web-search.js.map