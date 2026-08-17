import { Command } from 'commander';
import { isConfigKey, parseConfigValue } from '../lib/config.js';
import { maskApiKey } from '../lib/auth.js';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext } from './common.js';
import { writeOutput } from '../lib/output.js';
import { ValidationError } from '../lib/errors.js';
export function createConfigCommand() {
    const config = new Command('config').description('Manage CLI configuration');
    const set = addHelpOnMissingArgs(addGlobalOptions(new Command('set')))
        .description('Set a config value')
        .argument('<key>', 'Config key')
        .argument('<value>', 'Config value')
        .action((key, value) => {
        const context = createCommandContext(set, { requireAuth: false });
        const patch = parseConfigValue(key, value);
        context.configManager.save(patch);
        writeOutput({ ok: true, ...maskConfigApiKey(patch) }, context.outputFormat);
    });
    config.addCommand(set);
    const get = addHelpOnMissingArgs(addGlobalOptions(new Command('get')))
        .description('Get a config value')
        .argument('<key>', 'Config key')
        .action((key) => {
        const context = createCommandContext(get, { requireAuth: false });
        if (!isConfigKey(key)) {
            throw new ValidationError(`Unknown config key: ${key}`);
        }
        const value = key === 'api_key' ? maskApiKey(context.config.api_key) : context.config[key];
        writeOutput({ [key]: value }, context.outputFormat);
    });
    config.addCommand(get);
    const list = addGlobalOptions(new Command('list'))
        .description('List all config values')
        .action(() => {
        const context = createCommandContext(list, { requireAuth: false });
        writeOutput(maskConfigApiKey(context.config), context.outputFormat);
    });
    config.addCommand(list);
    const reset = addGlobalOptions(new Command('reset'))
        .description('Delete the config file')
        .action(() => {
        const context = createCommandContext(reset, { requireAuth: false });
        context.configManager.reset();
        writeOutput({ ok: true, config_file: context.configManager.path }, context.outputFormat);
    });
    config.addCommand(reset);
    return config;
}
function maskConfigApiKey(config) {
    return {
        ...config,
        ...(config.api_key !== undefined ? { api_key: maskApiKey(config.api_key) } : {})
    };
}
//# sourceMappingURL=config.js.map