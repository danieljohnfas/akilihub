import { Command } from 'commander';
import { addGlobalOptions, createCommandContext, requireClient, resolveModel } from './common.js';
import { writeOutput } from '../lib/output.js';
import { attachmentPartForUrl, fileToDataUrl, inferAttachmentType } from '../lib/upload.js';
import { extractStreamText } from '../lib/stream.js';
import { withProgress } from '../utils/logger.js';
import { readStdin } from '../utils/stdin.js';
import { ensureFileExists, parseJsonArray, requireValue } from '../utils/validators.js';
export function createChatCommand() {
    const command = addGlobalOptions(new Command('chat'))
        .description('Send a message and get a reply')
        .argument('[message]', 'Message to send; reads from stdin if omitted')
        .option('-s, --system <prompt>', 'System prompt')
        .option('--file <path>', 'Attach a local file')
        .option('--url <url>', 'Attach a file or image by URL')
        .option('--history <json>', 'Conversation history as a JSON array')
        .option('--tools <json>', 'Tool/function definitions as a JSON array')
        .option('--thinking', 'Enable model thinking mode when supported')
        .option('--from-file <path>', 'Read the user message from a local text file')
        .addHelpText('after', `
Examples:
  zai-cli chat "explain quantum computing"
  echo "summarize this" | zai-cli chat
  zai-cli chat "what is in this image?" --file ./photo.jpg --stream
  zai-cli chat "hello" -m glm-5.1 -s "reply in formal english"`);
    command.action(async (message) => {
        const options = command.opts();
        const context = createCommandContext(command, { useCoding: true });
        const client = requireClient(context);
        const input = await resolveMessage(message, options, command);
        const hasAttachment = Boolean(options.file || options.url);
        const model = resolveModel(context, hasAttachment ? context.config.default_multimodal_model : context.config.default_chat_model);
        const messages = await buildMessages(input, options);
        const body = {
            model,
            messages,
            stream: Boolean(context.globalOptions.stream)
        };
        if (context.globalOptions.requestId) {
            body.request_id = context.globalOptions.requestId;
        }
        const tools = parseJsonArray(options.tools, 'tools');
        if (tools) {
            body.tools = tools;
        }
        if (options.thinking) {
            body.thinking = { type: 'enabled' };
        }
        if (context.globalOptions.stream) {
            for await (const chunk of client.stream('/chat/completions', body)) {
                process.stdout.write(extractStreamText(chunk));
            }
            process.stdout.write('\n');
            return;
        }
        const response = await withProgress('Sending chat request', () => client.post('/chat/completions', body));
        writeOutput(normalizeChatResponse(response.data), context.outputFormat);
    });
    return command;
}
async function resolveMessage(message, options, command) {
    if (options.fromFile) {
        ensureFileExists(options.fromFile);
        const { readFile } = await import('node:fs/promises');
        return requireValue((await readFile(options.fromFile, 'utf8')).trim(), 'Message file is empty');
    }
    if (message && message.trim().length > 0) {
        return message;
    }
    const stdinContent = await readStdin();
    if (!stdinContent) {
        command.outputHelp();
        process.exit(0);
    }
    return stdinContent;
}
async function buildMessages(message, options) {
    const history = parseJsonArray(options.history, 'history');
    const messages = [];
    if (options.system) {
        messages.push({ role: 'system', content: options.system });
    }
    if (history) {
        messages.push(...history);
    }
    const userContent = await buildUserContent(message, options);
    messages.push({ role: 'user', content: userContent });
    return messages;
}
async function buildUserContent(message, options) {
    const parts = [{ type: 'text', text: message }];
    if (options.url) {
        parts.push(attachmentPartForUrl(options.url));
    }
    if (options.file) {
        ensureFileExists(options.file);
        const dataUrl = await fileToDataUrl(options.file);
        parts.push(inferAttachmentType(options.file) === 'image' ? { type: 'image_url', image_url: { url: dataUrl } } : {
            type: 'file_url',
            file_url: { url: dataUrl }
        });
    }
    return parts.length === 1 ? message : parts;
}
function normalizeChatResponse(data) {
    const message = data.choices?.[0]?.message;
    return {
        content: message?.content ?? '',
        ...(message?.reasoning_content ? { reasoning_content: message.reasoning_content } : {}),
        ...(message?.tool_calls ? { tool_calls: message.tool_calls } : {}),
        ...(data.model ? { model: data.model } : {}),
        ...(data.usage ? { usage: data.usage } : {}),
        ...(data.id ? { id: data.id } : {}),
        ...(data.request_id ? { request_id: data.request_id } : {})
    };
}
//# sourceMappingURL=chat.js.map