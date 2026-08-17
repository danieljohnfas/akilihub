import { Command } from 'commander';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext, requireClient } from './common.js';
import { pollTask } from '../lib/poll.js';
import { writeOutput } from '../lib/output.js';
import { withProgress } from '../utils/logger.js';
import { parsePositiveInteger } from '../utils/validators.js';
export function createTaskQueryCommand() {
    const command = addHelpOnMissingArgs(addGlobalOptions(new Command('task-query')))
        .description('Check the status and result of an async task')
        .argument('<task_id>', 'ID of the async task to query')
        .option('--wait', 'Poll until the task reaches SUCCESS or FAIL')
        .option('--poll-interval <ms>', 'Polling interval for --wait', '5000')
        .option('--max-wait <ms>', 'Maximum wait time for --wait', '600000')
        .addHelpText('after', `
Examples:
  zai-cli task-query abc123def456
  zai-cli task-query abc123def456 --wait
  zai-cli video-gen "sunset" | jq -r '.task_id' | xargs zai-cli task-query --wait`);
    command.action(async (taskId) => {
        const options = command.opts();
        const context = createCommandContext(command);
        const client = requireClient(context);
        if (options.wait) {
            const result = await withProgress('Waiting for task', () => pollTask(client, taskId, {
                intervalMs: parsePositiveInteger(options.pollInterval ?? '5000', 'poll-interval'),
                maxWaitMs: parsePositiveInteger(options.maxWait ?? '600000', 'max-wait')
            }));
            writeOutput(result, context.outputFormat);
            return;
        }
        const response = await withProgress('Querying task', () => client.get(`/async-result/${encodeURIComponent(taskId)}`));
        writeOutput({ ...response.data, task_id: response.data.task_id ?? response.data.id ?? taskId }, context.outputFormat);
    });
    return command;
}
//# sourceMappingURL=task-query.js.map