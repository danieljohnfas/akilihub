import { stdin as input, stderr as interactiveOutput } from 'node:process';
import { Command } from 'commander';
import { maskApiKey } from '../lib/auth.js';
import { ValidationError } from '../lib/errors.js';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext } from './common.js';
import { writeOutput } from '../lib/output.js';
import { parseRegion } from '../utils/validators.js';
import { runInteractiveLogin } from './auth-interactive.js';
export function createAuthCommand() {
    const auth = new Command('auth').description('Manage API key and region');
    const login = addGlobalOptions(new Command('login'))
        .description('Interactive setup: set API key and select region')
        .action(async () => {
        const context = createCommandContext(login, { requireAuth: false });
        if (!input.isTTY || !interactiveOutput.isTTY) {
            const key = process.env.ZAI_API_KEY?.trim();
            const regionRaw = process.env.ZAI_REGION?.trim();
            if (!key) {
                throw new ValidationError('Non-interactive auth login requires ZAI_API_KEY to be set');
            }
            const region = regionRaw ? parseRegion(regionRaw) : context.region;
            context.auth.saveKey(key, region);
            writeOutput({ ok: true, region, config_file: context.configManager.path }, context.outputFormat);
            return;
        }
        writeOutput(await runInteractiveLogin(context), context.outputFormat);
    });
    auth.addCommand(login);
    const set = addHelpOnMissingArgs(addGlobalOptions(new Command('set')))
        .description('Set API key and optionally region in one command')
        .argument('<key>', 'API key')
        .option('--region <region>', 'Region: china or global')
        .action((key) => {
        const options = set.opts();
        const context = createCommandContext(set, { requireAuth: false });
        const region = options.region ? parseRegion(options.region) : undefined;
        context.auth.saveKey(key, region);
        writeOutput({ ok: true, region: region ?? context.region, api_key: maskApiKey(key), config_file: context.configManager.path }, context.outputFormat);
    });
    auth.addCommand(set);
    const setRegion = addHelpOnMissingArgs(addGlobalOptions(new Command('set-region')))
        .description('Set region: global or china')
        .argument('<region>', 'global or china')
        .action((regionValue) => {
        const context = createCommandContext(setRegion, { requireAuth: false });
        const region = parseRegion(regionValue);
        context.configManager.save({ region });
        writeOutput({ ok: true, region, base_url: context.auth.getBaseUrl(region) }, context.outputFormat);
    });
    auth.addCommand(setRegion);
    const status = addGlobalOptions(new Command('status'))
        .description('Show current auth status')
        .action(() => {
        const context = createCommandContext(status, { requireAuth: false });
        const apiKey = context.auth.resolveKey(context.globalOptions.apiKey);
        writeOutput({
            configured: Boolean(apiKey),
            region: context.region,
            base_url: context.baseUrl,
            api_key: maskApiKey(apiKey),
            config_file: context.configManager.path
        }, context.outputFormat);
    });
    auth.addCommand(status);
    const revoke = addGlobalOptions(new Command('revoke'))
        .description('Delete the stored API key')
        .action(() => {
        const context = createCommandContext(revoke, { requireAuth: false });
        context.auth.revoke();
        writeOutput({ ok: true, config_file: context.configManager.path }, context.outputFormat);
    });
    auth.addCommand(revoke);
    return auth;
}
//# sourceMappingURL=auth.js.map