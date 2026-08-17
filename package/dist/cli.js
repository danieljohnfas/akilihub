#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { Command, CommanderError } from 'commander';
import { createAuthCommand, createAudioTranscribeCommand, createChatCommand, createConfigCommand, createDocParseCommand, createImageGenCommand, createTaskQueryCommand, createUpdateCommand, createVideoGenCommand, createWebReadCommand, createWebSearchCommand } from './commands/index.js';
import { addGlobalOptions } from './commands/common.js';
import { normalizeError, ValidationError } from './lib/errors.js';
import { writeError } from './lib/output.js';
import { PACKAGE_VERSION } from './lib/constants.js';
export function createProgram() {
    const program = addGlobalOptions(new Command('zai-cli'))
        .description('Z.ai CLI - Terminal-native toolkit for AI agents: chat, media, parse, search, and more')
        .usage('<command> [flags]')
        .version(PACKAGE_VERSION, '-v, --version')
        .addHelpText('after', `
Examples:
  zai-cli chat "what is quantum computing?"
  zai-cli image-gen "a cat floating in space"
  zai-cli audio-transcribe ./meeting.mp3

Learn more: https://docs.z.ai/cli`);
    program.addCommand(createChatCommand());
    program.addCommand(createImageGenCommand());
    program.addCommand(createVideoGenCommand());
    program.addCommand(createTaskQueryCommand());
    program.addCommand(createAudioTranscribeCommand());
    program.addCommand(createWebSearchCommand());
    program.addCommand(createWebReadCommand());
    program.addCommand(createDocParseCommand());
    program.addCommand(createAuthCommand());
    program.addCommand(createConfigCommand());
    program.addCommand(createUpdateCommand());
    return program;
}
export async function runCli(argv = process.argv) {
    const program = createProgram();
    // If no command is provided, show help and exit
    if (argv.length <= 2) {
        program.outputHelp({ error: false });
        return;
    }
    try {
        await program.parseAsync(argv);
    }
    catch (error) {
        if (error instanceof CommanderError && ['commander.helpDisplayed', 'commander.version'].includes(error.code)) {
            return;
        }
        const normalized = error instanceof CommanderError
            ? new ValidationError(error.message.replace(/^error: /, ''))
            : normalizeError(error);
        writeError(normalized);
    }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
    await runCli();
}
//# sourceMappingURL=cli.js.map