export declare function fileToDataUrl(filePath: string): Promise<string>;
export declare function mimeTypeForPath(filePath: string): string;
export declare function attachmentPartForUrl(url: string): Record<string, unknown>;
export declare function inferAttachmentType(urlOrPath: string): 'image' | 'file';
