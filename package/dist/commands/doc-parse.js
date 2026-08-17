import { Command } from 'commander';
import { addGlobalOptions, createCommandContext, requireClient, resolveModel } from './common.js';
import { ValidationError } from '../lib/errors.js';
import { writeOutput } from '../lib/output.js';
import { fileToDataUrl } from '../lib/upload.js';
import { withProgress } from '../utils/logger.js';
import { ensureFileExists, parsePositiveInteger, parseUrl } from '../utils/validators.js';
export function createDocParseCommand() {
    const command = addGlobalOptions(new Command('doc-parse'))
        .description('Parse document content with OCR/layout parsing')
        .argument('[file]', 'Path to the local document file')
        .option('--url <url>', 'Document URL')
        .option('--return-crop-images', 'Return cropped element images when supported')
        .option('--visualization', 'Return layout visualization images when supported')
        .option('--start-page <page>', 'Start page for PDF parsing')
        .option('--end-page <page>', 'End page for PDF parsing')
        .addHelpText('after', `
Examples:
  zai-cli doc-parse ./contract.pdf
  zai-cli doc-parse --url "https://example.com/doc.pdf"
  zai-cli doc-parse ./contract.pdf --output text`);
    command.action(async (file) => {
        const options = command.opts();
        const context = createCommandContext(command);
        const client = requireClient(context);
        const body = {
            model: resolveModel(context, context.config.default_ocr_model),
            return_crop_images: Boolean(options.returnCropImages),
            need_layout_visualization: Boolean(options.visualization)
        };
        if (options.url) {
            body.file = parseUrl(options.url);
        }
        else if (file) {
            ensureFileExists(file);
            body.file = await fileToDataUrl(file);
        }
        else {
            throw new ValidationError('Either a local file or --url is required');
        }
        if (options.startPage) {
            body.start_page_id = parsePositiveInteger(options.startPage, 'start-page');
        }
        if (options.endPage) {
            body.end_page_id = parsePositiveInteger(options.endPage, 'end-page');
        }
        if (context.globalOptions.requestId) {
            body.request_id = context.globalOptions.requestId;
        }
        const response = await withProgress('Parsing document', () => client.post('/layout_parsing', body));
        writeOutput(response.data, context.outputFormat);
    });
    return command;
}
//# sourceMappingURL=doc-parse.js.map