import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const PACKAGE_VERSION = getCurrentVersion();
function getCurrentVersion() {
    try {
        const packageJsonPath = join(fileURLToPath(new URL('../..', import.meta.url)), 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version || '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
export const CONFIG_DIR_NAME = '.zai/zai-cli';
export const CONFIG_FILE_NAME = 'config.json';
export const LOG_DIR_NAME = 'logs';
export const REGION_BASE_URLS = {
    global: 'https://api.z.ai/api/paas/v4',
    china: 'https://open.bigmodel.cn/api/paas/v4'
};
export const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const DEFAULT_CONFIG = {
    region: 'china',
    base_url: REGION_BASE_URLS.china,
    default_chat_model: 'glm-5.1',
    default_multimodal_model: 'glm-5v-turbo',
    default_image_model: 'glm-image',
    default_video_model: 'cogvideox-3',
    default_audio_model: 'glm-asr-2512',
    default_ocr_model: 'glm-ocr',
    default_web_search_engine: 'search-prime',
    timeout: DEFAULT_TIMEOUT,
    output_format: 'json'
};
//# sourceMappingURL=constants.js.map