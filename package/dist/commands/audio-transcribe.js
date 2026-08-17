import { Command } from 'commander';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext, requireClient, resolveModel } from './common.js';
import { writeOutput } from '../lib/output.js';
import { withProgress } from '../utils/logger.js';
import { ensureFileExists, validateFileSize } from '../utils/validators.js';
export function createAudioTranscribeCommand() {
    const command = addHelpOnMissingArgs(addGlobalOptions(new Command('audio-transcribe')))
        .description('Transcribe an audio or video file to text')
        .argument('<file>', 'Path to the audio or video file to transcribe')
        .option('--language <lang>', 'Language hint, e.g. zh, en')
        .option('--prompt <text>', 'Previous transcription context when supported')
        .addHelpText('after', `
Examples:
  zai-cli audio-transcribe ./recording.mp3
  zai-cli audio-transcribe ./meeting.wav --language zh
  zai-cli audio-transcribe ./interview.mp3 | jq -r '.text'`);
    command.action(async (file) => {
        const options = command.opts();
        const context = createCommandContext(command);
        const client = requireClient(context);
        ensureFileExists(file);
        validateFileSize(file, 25);
        const response = await withProgress('Transcribing audio', () => client.upload('/audio/transcriptions', file, {
            model: resolveModel(context, context.config.default_audio_model),
            stream: false,
            ...(options.language ? { language: options.language } : {}),
            ...(options.prompt ? { prompt: options.prompt } : {})
        }));
        writeOutput(response.data, context.outputFormat);
    });
    return command;
}
//# sourceMappingURL=audio-transcribe.js.map