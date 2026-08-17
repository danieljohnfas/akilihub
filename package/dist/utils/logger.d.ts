interface CallLogOptions {
    logDir?: string;
    now?: Date;
}
export declare function withProgress<T>(message: string, action: () => Promise<T>): Promise<T>;
export declare function writeCallLog(message: string, options?: CallLogOptions): void;
export {};
