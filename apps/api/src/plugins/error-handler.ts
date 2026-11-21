import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { apiErrorCodeSchema, errorResponseSchema } from '@reel/shared';
import type { ApiErrorCode, ErrorResponse } from '@reel/shared';
import { AppError } from '../lib/errors.js';

interface HttpError {
  statusCode?: number;
  code?: string;
  message?: string;
  validation?: unknown;
}

function asHttpError(error: unknown): HttpError {
  return typeof error === 'object' && error !== null ? (error as HttpError) : {};
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: unknown,
): ErrorResponse {
  return { error: { code, message, requestId, ...(details === undefined ? {} : { details }) } };
}

export function installErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, request, reply) => {
    const httpError = asHttpError(error);
    const validationError =
      error instanceof ZodError
        ? error
        : httpError.validation instanceof ZodError
          ? httpError.validation
          : null;

    if (validationError) {
      app.log.debug({ err: validationError, requestId: request.id }, 'validation failed');
      void reply
        .code(400)
        .send(
          errorResponseSchema.parse(
            errorResponse(
              'VALIDATION_ERROR',
              'Request validation failed',
              request.id,
              validationError.issues,
            ),
          ),
        );
      return;
    }

    if (error instanceof AppError) {
      void reply
        .code(error.statusCode)
        .send(
          errorResponseSchema.parse(
            errorResponse(error.code, error.message, request.id, error.details),
          ),
        );
      return;
    }

    const statusCode =
      typeof httpError.statusCode === 'number' &&
      httpError.statusCode >= 400 &&
      httpError.statusCode < 500
        ? httpError.statusCode
        : 500;
    if (statusCode === 500) {
      app.log.error({ err: error, requestId: request.id }, 'unhandled request error');
    }

    const rawCode = httpError.code;
    const parsedCode = apiErrorCodeSchema.safeParse(rawCode);
    const code: ApiErrorCode = parsedCode.success
      ? parsedCode.data
      : statusCode === 500
        ? 'INTERNAL_ERROR'
        : 'REQUEST_ERROR';

    void reply
      .code(statusCode)
      .send(
        errorResponseSchema.parse(
          errorResponse(
            code,
            statusCode === 500 ? 'Internal server error' : (httpError.message ?? 'Request failed'),
            request.id,
          ),
        ),
      );
  });

  app.setNotFoundHandler((request, reply) => {
    void reply
      .code(404)
      .send(errorResponseSchema.parse(errorResponse('NOT_FOUND', 'Route not found', request.id)));
  });
}
