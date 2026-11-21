import type { ApiErrorCode } from '@reel/shared';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: ApiErrorCode, message: string, details?: unknown): AppError {
  return new AppError(400, code, message, details);
}

export function unauthorized(code: ApiErrorCode, message: string): AppError {
  return new AppError(401, code, message);
}

export function forbidden(code: ApiErrorCode, message: string): AppError {
  return new AppError(403, code, message);
}

export function conflict(code: ApiErrorCode, message: string): AppError {
  return new AppError(409, code, message);
}
