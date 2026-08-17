import { Command } from 'commander';
import { addGlobalOptions } from './common.js';
import { writeOutput } from '../lib/output.js';
import { Updater } from '../lib/updater.js';
import { ValidationError } from '../lib/errors.js';
export function createUpdateCommand() {
    return addGlobalOptions(new Command('update'))
        .description('Check for and install the latest version of zai-cli')
        .option('--check', 'Check for updates without installing')
        .option('--force', 'Force update even if already on latest version')
        .option('--channel <channel>', 'Release channel: latest (default) or beta', 'latest')
        .action(async (options) => {
        await handleUpdate(options);
    });
}
async function handleUpdate(options) {
    const channel = parseChannel(options.channel ?? 'latest');
    if (options.check) {
        await checkForUpdates(channel);
    }
    else {
        await performUpdate(channel, options.force ?? false);
    }
}
async function checkForUpdates(channel) {
    const result = await Updater.checkForUpdates(channel);
    writeOutput(result, 'json');
}
async function performUpdate(channel, force) {
    const result = await Updater.performUpdate(channel, force);
    writeOutput(result, 'json');
}
function parseChannel(value) {
    if (value === 'latest' || value === 'beta') {
        return value;
    }
    throw new ValidationError(`Invalid channel: ${value}. Expected 'latest' or 'beta'.`);
}
//# sourceMappingURL=update.js.map