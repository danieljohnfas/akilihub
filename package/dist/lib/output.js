import { inspect } from 'node:util';
import { normalizeError } from './errors.js';
export function formatOutput(data, format) {
    switch (format) {
        case 'json':
            return `${JSON.stringify(data, null, 2)}\n`;
        case 'text':
            return `${formatText(data)}\n`;
        case 'table':
            return `${formatTable(data)}\n`;
        default:
            return `${JSON.stringify(data, null, 2)}\n`;
    }
}
export function writeOutput(data, format) {
    process.stdout.write(formatOutput(data, format));
}
export function writeError(error) {
    const normalized = normalizeError(error);
    const body = {
        error: {
            code: normalized.code,
            message: normalized.message,
            ...(normalized.requestId ? { request_id: normalized.requestId } : {}),
            ...(normalized.statusCode ? { status_code: normalized.statusCode } : {})
        }
    };
    process.stderr.write(`${JSON.stringify(body, null, 2)}\n`);
}
function formatText(data) {
    if (data === null || data === undefined) {
        return '';
    }
    if (typeof data === 'string') {
        return data;
    }
    if (typeof data !== 'object') {
        return String(data);
    }
    if (Array.isArray(data)) {
        return data.map((item) => formatText(item)).join('\n');
    }
    const record = data;
    const preferred = [
        record.content,
        record.text,
        getNested(record, ['reader_result', 'content']),
        record.md_results,
        record.url
    ].find((value) => typeof value === 'string' && value.length > 0);
    if (typeof preferred === 'string') {
        return preferred;
    }
    if (Array.isArray(record.results)) {
        return record.results.map((item) => formatText(item)).join('\n');
    }
    if (Array.isArray(record.search_result)) {
        return record.search_result
            .map((item) => {
            if (!isRecord(item)) {
                return formatText(item);
            }
            const title = typeof item.title === 'string' ? item.title : '';
            const link = typeof item.link === 'string' ? item.link : '';
            const content = typeof item.content === 'string' ? item.content : '';
            return [title, link, content].filter(Boolean).join('\n');
        })
            .join('\n\n');
    }
    return inspect(data, { colors: false, depth: null });
}
function formatTable(data) {
    const rows = normalizeRows(data);
    if (rows.length === 0) {
        return formatText(data);
    }
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => stringifyCell(row[column]).length)));
    const header = columns.map((column, index) => column.padEnd(widths[index])).join('  ');
    const separator = widths.map((width) => '-'.repeat(width)).join('  ');
    const body = rows
        .map((row) => columns.map((column, index) => stringifyCell(row[column]).padEnd(widths[index])).join('  '))
        .join('\n');
    return `${header}\n${separator}${body ? `\n${body}` : ''}`;
}
function normalizeRows(data) {
    if (Array.isArray(data)) {
        return data.filter(isRecord);
    }
    if (isRecord(data)) {
        if (Array.isArray(data.data)) {
            return data.data.filter(isRecord);
        }
        if (Array.isArray(data.results)) {
            return data.results.filter(isRecord);
        }
        if (Array.isArray(data.search_result)) {
            return data.search_result.filter(isRecord);
        }
        if (Array.isArray(data.video_result)) {
            return data.video_result.filter(isRecord);
        }
        return [data];
    }
    return [];
}
function stringifyCell(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
function getNested(record, path) {
    let current = record;
    for (const part of path) {
        if (!isRecord(current)) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=output.js.map