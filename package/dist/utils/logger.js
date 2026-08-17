import { appendFileSync, chmodSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CONFIG_DIR_NAME, LOG_DIR_NAME } from '../lib/constants.js';
export async function withProgress(message, action) {
    return action();
}
export function writeCallLog(message, options = {}) {
    const now = options.now ?? new Date();
    const logDir = options.logDir ?? process.env.ZAI_LOG_DIR ?? join(homedir(), CONFIG_DIR_NAME, LOG_DIR_NAME);
    try {
        mkdirSync(logDir, { recursive: true, mode: 0o700 });
        chmodSync(logDir, 0o700);
        const logFile = join(logDir, `${formatLocalDate(now)}.log`);
        appendFileSync(logFile, `${now.toISOString()} ${message}\n`, { encoding: 'utf8', mode: 0o600 });
        chmodSync(logFile, 0o600);
    }
    catch {
        // File logging must not change the result of an API call.
    }
}
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
//# sourceMappingURL=logger.js.map