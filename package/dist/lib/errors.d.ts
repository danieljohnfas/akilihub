export interface ZaiErrorOptions {
    code?: string;
    requestId?: string;
    statusCode?: number;
    cause?: unknown;
}
export declare class ZaiError extends Error {
    code: string;
    requestId?: string;
    statusCode?: number;
    constructor(message: string, options?: ZaiErrorOptions);
}
export declare class AuthError extends ZaiError {
    constructor(message: string, options?: ZaiErrorOptions);
}
export declare class NetworkError extends ZaiError {
    constructor(message: string, options?: ZaiErrorOptions);
}
export declare class ValidationError extends ZaiError {
    constructor(message: string, options?: ZaiErrorOptions);
}
export declare class ApiError extends ZaiError {
    responseBody?: unknown;
    constructor(message: string, options?: ZaiErrorOptions & {
        responseBody?: unknown;
    });
}
export declare class UpdateError extends ZaiError {
    constructor(message: string, options?: ZaiErrorOptions);
}
export declare class CancelledError extends ZaiError {
    constructor(message: string, options?: ZaiErrorOptions);
}
export declare function normalizeError(error: unknown): ZaiError;
