import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, ErrorCode } from '../lib/errors';
import { sendError } from '../lib/api-response';
import { env } from '../config/env';

/** Translate any thrown value into the standard error envelope. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  if (error instanceof ZodError) {
    sendError(res, 422, ErrorCode.VALIDATION_ERROR, 'Validation failed.', error.flatten());
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      sendError(res, 409, ErrorCode.CONFLICT, 'A record with these details already exists.');
      return;
    }
    if (error.code === 'P2025') {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Resource not found.');
      return;
    }
  }

  // Unknown / unexpected error — never leak internals to the client.
  console.error('[unhandled error]', error);
  const message = env.isProduction
    ? 'Internal server error.'
    : error instanceof Error
      ? error.message
      : 'Internal server error.';
  sendError(res, 500, ErrorCode.INTERNAL, message);
}

/** 404 fallthrough for unmatched API routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, ErrorCode.NOT_FOUND, 'Route not found.');
}
