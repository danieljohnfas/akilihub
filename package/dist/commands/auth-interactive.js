import { emitKeypressEvents } from 'node:readline';
import { stdin, stderr } from 'node:process';
import chalk from 'chalk';
import ora from 'ora';
import { REGION_BASE_URLS } from '../lib/constants.js';
import { CancelledError, ValidationError } from '../lib/errors.js';
const LOGIN_ASCII = [
    '  Z.ai CLI  '
];
const BANNER_WIDTH = 66;
export const REGION_OPTIONS = [
    {
        value: 'china',
        label: 'China',
        detail: 'open.bigmodel.cn',
        description: 'Mainland China endpoint',
        apiKeyUrl: 'https://bigmodel.cn/apikey/platform'
    },
    {
        value: 'global',
        label: 'Global',
        detail: 'api.z.ai',
        description: 'International endpoint',
        apiKeyUrl: 'https://z.ai/manage-apikey/apikey-list'
    }
];
export function resolveRegionChoice(value) {
    if (!value) {
        return undefined;
    }
    const index = Number(value.trim());
    if (!Number.isInteger(index) || index < 1 || index > REGION_OPTIONS.length) {
        return undefined;
    }
    return REGION_OPTIONS[index - 1].value;
}
export async function runInteractiveLogin(context) {
    writeLoginHeader(context.auth.resolveKey(context.globalOptions.apiKey));
    const region = await promptRegion(context.region);
    const option = getRegionOption(region);
    writeApiKeyPanel(region, option);
    const key = (await promptSecret(`${chalk.cyan('?')} API key ${chalk.gray('(hidden input)')} ${chalk.gray('>')} `)).trim();
    if (!key) {
        throw new ValidationError('API key is required');
    }
    const spinner = ora({
        text: 'Saving credentials...',
        spinner: 'dots'
    }).start();
    context.auth.saveKey(key, region);
    spinner.succeed(chalk.green(`Credentials saved for ${option.label}`));
    stderr.write(`${chalk.gray('Run')} ${chalk.white('zai-cli auth status')} ${chalk.gray('to inspect the active configuration.')}\n\n`);
    return { ok: true, region, config_file: context.configManager.path };
}
function writeLoginHeader(existingKey) {
    const status = existingKey ? chalk.green('API key already configured') : chalk.yellow('API key not configured');
    stderr.write([
        '',
        chalk.cyan.bold(createBorderLine('+', '+', '-')),
        ...LOGIN_ASCII.map((line) => chalk.cyan.bold(createContentLine(line, '|', '|'))),
        chalk.cyan.bold(createContentLine('API credentials setup', '|', '|')),
        chalk.cyan.bold(createBorderLine('+', '+', '-')),
        '',
        `${chalk.gray('Status ')} ${status}`,
        `${chalk.gray('Flow   ')} ${chalk.white('[1] Region')} ${chalk.gray('->')} ${chalk.white('[2] API key')}`,
        ''
    ].join('\n'));
}
function writeApiKeyPanel(region, option) {
    stderr.write([
        chalk.cyan.bold(createSectionTitle('[2/2] API key')),
        `${chalk.gray('Region  ')} ${chalk.white(option.label)} ${chalk.gray(`(${region})`)}`,
        `${chalk.gray('Endpoint')} ${chalk.white(REGION_BASE_URLS[region])}`,
        `${chalk.gray('Get key ')} ${chalk.blue(option.apiKeyUrl)}`,
        ''
    ].join('\n'));
}
function getRegionOption(region) {
    return REGION_OPTIONS.find((option) => option.value === region) ?? REGION_OPTIONS[0];
}
async function promptRegion(defaultRegion) {
    const defaultIndex = Math.max(0, REGION_OPTIONS.findIndex((option) => option.value === defaultRegion));
    const selectedIndex = await selectOption('[1/2] Select API region', REGION_OPTIONS.map((option) => ({
        title: option.label,
        value: option.value,
        detail: option.detail,
        description: option.description,
        current: option.value === defaultRegion
    })), defaultIndex);
    return REGION_OPTIONS[selectedIndex].value;
}
async function selectOption(title, options, defaultIndex, streams = { input: stdin, output: stderr }) {
    const { input, output } = streams;
    let selectedIndex = defaultIndex;
    let renderedLines = 0;
    return withRawMode(input, () => new Promise((resolve, reject) => {
        const render = () => {
            clearLines(output, renderedLines);
            const text = renderSelect(title, options, selectedIndex);
            output.write(text);
            renderedLines = countRenderedLines(text);
        };
        const finish = (index) => {
            cleanup();
            clearLines(output, renderedLines);
            const option = options[index];
            output.write(`${chalk.green('Selected')} ${option.title} ${chalk.gray(`(${option.value})`)}\n\n`);
            resolve(index);
        };
        const cancel = () => {
            cleanup();
            clearLines(output, renderedLines);
            reject(new CancelledError('Login cancelled'));
        };
        const onKeypress = (character, key) => {
            if (key.ctrl && key.name === 'c') {
                cancel();
                return;
            }
            if (key.name === 'escape') {
                cancel();
                return;
            }
            if (key.name === 'up') {
                selectedIndex = selectedIndex === 0 ? options.length - 1 : selectedIndex - 1;
                render();
                return;
            }
            if (key.name === 'down') {
                selectedIndex = selectedIndex === options.length - 1 ? 0 : selectedIndex + 1;
                render();
                return;
            }
            if (key.name === 'return' || key.name === 'enter') {
                finish(selectedIndex);
                return;
            }
            const region = resolveRegionChoice(character);
            if (region) {
                finish(options.findIndex((option) => option.value === region));
            }
        };
        const cleanup = () => {
            input.off('keypress', onKeypress);
        };
        input.on('keypress', onKeypress);
        render();
    }));
}
function renderSelect(title, options, selectedIndex) {
    const lines = [
        chalk.cyan.bold(createSectionTitle(title)),
        `${chalk.gray('Hint')}   Use Up/Down or 1/2, then press Enter.`,
        ''
    ];
    for (const [index, option] of options.entries()) {
        const active = index === selectedIndex;
        const pointer = active ? chalk.cyan.bold('>') : ' ';
        const number = chalk.gray(`${index + 1}.`);
        const region = `[${option.title}]`.padEnd(10);
        const current = option.current ? chalk.green('  (current)') : '';
        const body = `${active ? chalk.cyan.bold(region) : chalk.white(region)} ${chalk.gray(option.detail.padEnd(18))} ${option.description}${current}`;
        lines.push(`${pointer} ${number} ${body}`);
    }
    return `${lines.join('\n')}\n`;
}
async function promptSecret(prompt, streams = { input: stdin, output: stderr }) {
    const { input, output } = streams;
    let value = '';
    return withRawMode(input, () => new Promise((resolve, reject) => {
        const finish = () => {
            cleanup();
            output.write('\n');
            resolve(value);
        };
        const cancel = () => {
            cleanup();
            output.write('\n');
            reject(new CancelledError('Login cancelled'));
        };
        const redraw = () => {
            output.write(`\r\x1b[2K${prompt}${'*'.repeat(value.length)}`);
        };
        const onKeypress = (character, key) => {
            if (key.ctrl && key.name === 'c') {
                cancel();
                return;
            }
            if (key.name === 'escape') {
                cancel();
                return;
            }
            if (key.name === 'return' || key.name === 'enter') {
                finish();
                return;
            }
            if (key.name === 'backspace' || key.name === 'delete') {
                value = value.slice(0, -1);
                redraw();
                return;
            }
            if (key.ctrl || key.meta || !character || character < ' ') {
                return;
            }
            value += character;
            output.write('*'.repeat(character.length));
        };
        const cleanup = () => {
            input.off('keypress', onKeypress);
        };
        input.on('keypress', onKeypress);
        output.write(prompt);
    }));
}
async function withRawMode(input, callback) {
    const wasRaw = input.isRaw;
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    try {
        return await callback();
    }
    finally {
        input.setRawMode(wasRaw);
        input.pause();
    }
}
function clearLines(output, lineCount) {
    for (let index = 0; index < lineCount; index += 1) {
        output.write('\x1b[1A\r\x1b[2K');
    }
}
function countRenderedLines(value) {
    return value.endsWith('\n') ? value.split('\n').length - 1 : value.split('\n').length;
}
function createSectionTitle(title) {
    return `${title}\n${'-'.repeat(Math.min(BANNER_WIDTH, title.length))}`;
}
function createBorderLine(left, right, fill) {
    return `${left}${fill.repeat(BANNER_WIDTH - 2)}${right}`;
}
function createContentLine(content, left, right) {
    const width = BANNER_WIDTH - 2;
    const visible = stripAnsi(content);
    const padding = Math.max(0, width - visible.length);
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    return `${left}${' '.repeat(leftPadding)}${content}${' '.repeat(rightPadding)}${right}`;
}
function stripAnsi(value) {
    return value.replace(/\x1B\[[0-9;]*m/g, '');
}
//# sourceMappingURL=auth-interactive.js.map