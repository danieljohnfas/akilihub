import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
const MIME_BY_EXT = {
    '.apng': 'image/apng',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
export async function fileToDataUrl(filePath) {
    const buffer = await readFile(filePath);
    return `data:${mimeTypeForPath(filePath)};base64,${buffer.toString('base64')}`;
}
export function mimeTypeForPath(filePath) {
    return MIME_BY_EXT[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
export function attachmentPartForUrl(url) {
    const type = inferAttachmentType(url);
    if (type === 'image') {
        return { type: 'image_url', image_url: { url } };
    }
    return { type: 'file_url', file_url: { url } };
}
export function inferAttachmentType(urlOrPath) {
    const withoutQuery = urlOrPath.split('?')[0] ?? urlOrPath;
    const mime = mimeTypeForPath(withoutQuery);
    return mime.startsWith('image/') ? 'image' : 'file';
}
//# sourceMappingURL=upload.js.map