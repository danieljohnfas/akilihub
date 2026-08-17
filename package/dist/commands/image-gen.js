import { Command } from 'commander';
import { addGlobalOptions, addHelpOnMissingArgs, createCommandContext, requireClient, resolveModel } from './common.js';
import { writeOutput } from '../lib/output.js';
import { withProgress } from '../utils/logger.js';
import { parsePositiveInteger } from '../utils/validators.js';
export function createImageGenCommand() {
    const command = addHelpOnMissingArgs(addGlobalOptions(new Command('image-gen')))
        .description('Generate an image from a text prompt')
        .argument('<prompt>', 'Text prompt describing the image to generate')
        .option('--size <WxH>', 'Image dimensions, e.g. 1280x1280')
        .option('-n, --count <count>', 'Number of images to generate', '1')
        .option('--quality <quality>', 'Image quality when supported')
        .addHelpText('after', `
Examples:
  zai-cli image-gen "a cat floating in space"
  zai-cli image-gen "cyberpunk cityscape at night" --size 1280x1280 -n 2
  zai-cli image-gen "abstract art" | jq -r '.results[0].url'`);
    command.action(async (prompt) => {
        const options = command.opts();
        const context = createCommandContext(command);
        const client = requireClient(context);
        const model = resolveModel(context, context.config.default_image_model);
        const body = {
            model,
            prompt,
            n: parsePositiveInteger(options.count ?? '1', 'count')
        };
        if (options.size) {
            body.size = options.size;
        }
        if (options.quality) {
            body.quality = options.quality;
        }
        if (context.globalOptions.requestId) {
            body.request_id = context.globalOptions.requestId;
        }
        const response = await withProgress('Generating image', () => client.post('/images/generations', body));
        writeOutput(normalizeImageResponse(response.data), context.outputFormat);
    });
    return command;
}
function normalizeImageResponse(data) {
    return {
        results: data.results ?? data.data ?? [],
        ...(data.model ? { model: data.model } : {}),
        ...(data.usage ? { usage: data.usage } : {}),
        ...(data.id ? { id: data.id } : {}),
        ...(data.request_id ? { request_id: data.request_id } : {}),
        ...(data.created ? { created: data.created } : {})
    };
}
//# sourceMappingURL=image-gen.js.map