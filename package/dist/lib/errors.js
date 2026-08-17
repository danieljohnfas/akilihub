export class ZaiError extends Error {
    code;
    requestId;
    statusCode;
    constructor(message, options = {}) {
        super(message);
        this.name = new.target.name;
        this.code = options.code ?? 'zai_error';
        this.requestId = options.requestId;
        this.statusCode = options.statusCode;
        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}
export class AuthError extends ZaiError {
    constructor(message, options = {}) {
        super(message, { ...options, code: options.code ?? 'auth_error' });
    }
}
export class NetworkError extends ZaiError {
    constructor(message, options = {}) {
        super(message, { ...options, code: options.code ?? 'network_error' });
    }
}
export class ValidationError extends ZaiError {
    constructor(message, options = {}) {
        super(message, { ...options, code: options.code ?? 'validation_error' });
    }
}
export class ApiError extends ZaiError {
    responseBody;
    constructor(message, options = {}) {
        super(message, { ...options, code: options.code ?? 'api_error' });
        this.responseBody = options.responseBody;
    }
}
export class UpdateError extends ZaiError {
    constructor(message, options = {}) {
        super(message, { ...options, code: options.code ?? 'update_error' });
    }
}
export class CancelledError extends ZaiError {
    constructor(message, options = {}) {
        super(message, { ...options, code: options.code ?? 'cancelled' });
    }
}
export function normalizeError(error) {
    if (error instanceof ZaiError) {
        return error;
    }
    if (error instanceof Error) {
        return new ZaiError(error.message, { cause: error });
    }
    return new ZaiError(String(error));
}
//# sourceMappingURL=errors.js.map