import { Command } from 'commander';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext, requireClient, resolveModel } from './common.js';
import { ApiError } from '../lib/errors.js';
import { pollTask } from '../lib/poll.js';
import { writeOutput } from '../lib/output.js';
import { fileToDataUrl } from '../lib/upload.js';
import { withProgress } from '../utils/logger.js';
import { ensureFileExists, parseBoolean, parsePositiveInteger } from '../utils/validators.js';
export function createVideoGenCommand() {
    const command = addHelpOnMissingArgs(addGlobalOptions(new Command('video-gen')))
        .description('Generate a video from a text prompt, or animate a reference image')
        .argument('<prompt>', 'Text prompt describing the video to generate')
        .option('--image <path>', 'Reference image for image-to-video generation')
        .option('--image-url <url>', 'Reference image URL')
        .option('--wait', 'Poll until complete and return the final result')
        .option('--quality <quality>', 'Output mode: speed or quality')
        .option('--size <WxH>', 'Video dimensions, e.g. 1920x1080')
        .option('--fps <fps>', 'Video frame rate, e.g. 30 or 60')
        .option('--duration <seconds>', 'Video duration in seconds')
        .option('--with-audio <true|false>', 'Generate AI sound effects when supported')
        .option('--poll-interval <ms>', 'Polling interval for --wait', '5000')
        .option('--max-wait <ms>', 'Maximum wait time for --wait', '600000')
        .addHelpText('after', `
Examples:
  zai-cli video-gen "timelapse of a sunrise" | jq -r '.task_id'
  zai-cli video-gen "ocean waves crashing" --wait
  zai-cli video-gen "the photographer walks in" --image ./scene.jpg --wait`);
    command.action(async (prompt) => {
        const options = command.opts();
        const context = createCommandContext(command);
        const client = requireClient(context);
        const model = resolveModel(context, context.config.default_video_model);
        const body = {
            model,
            prompt
        };
        if (context.globalOptions.requestId) {
            body.request_id = context.globalOptions.requestId;
        }
        if (options.quality) {
            body.quality = options.quality;
        }
        if (options.size) {
            body.size = options.size;
        }
        if (options.fps) {
            body.fps = parsePositiveInteger(options.fps, 'fps');
        }
        if (options.duration) {
            body.duration = parsePositiveInteger(options.duration, 'duration');
        }
        if (options.withAudio !== undefined) {
            body.with_audio = parseBoolean(options.withAudio, 'with-audio');
        }
        const imageUrls = [];
        if (options.imageUrl) {
            imageUrls.push(options.imageUrl);
        }
        if (options.image) {
            ensureFileExists(options.image);
            imageUrls.push(await fileToDataUrl(options.image));
        }
        if (imageUrls.length > 0) {
            body.image_url = imageUrls;
        }
        const response = await withProgress('Submitting video task', () => client.post('/videos/generations', body));
        const task = normalizeVideoStartResponse(response.data);
        if (typeof task.task_id !== 'string' || task.task_id.length === 0) {
            throw new ApiError('Video generation response did not contain a task_id', {
                code: 'invalid_api_response',
                responseBody: response.data
            });
        }
        const taskId = task.task_id;
        if (!options.wait) {
            writeOutput(task, context.outputFormat);
            return;
        }
        const result = await withProgress('Waiting for video task', () => pollTask(client, taskId, {
            intervalMs: parsePositiveInteger(options.pollInterval ?? '5000', 'poll-interval'),
            maxWaitMs: parsePositiveInteger(options.maxWait ?? '600000', 'max-wait')
        }));
        writeOutput(result, context.outputFormat);
    });
    return command;
}
function normalizeVideoStartResponse(data) {
    return {
        task_id: data.task_id ?? data.id,
        ...(data.task_status ? { task_status: data.task_status } : {}),
        ...(data.model ? { model: data.model } : {}),
        ...(data.request_id ? { request_id: data.request_id } : {})
    };
}
//# sourceMappingURL=video-gen.js.map