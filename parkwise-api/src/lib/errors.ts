/**
 * Centralized error model. Every thrown AppError carries an HTTP status, a
 * stable machine-readable `code`, and a human message. The error middleware
 * turns these into the standard `{ success:false, error:{ code, message } }`
 * response shape.
 */

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode | string;
  readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode | string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, ErrorCode.BAD_REQUEST, message, details);

export const validationError = (message: string, details?: unknown) =>
  new AppError(422, ErrorCode.VALIDATION_ERROR, message, details);

export const unauthenticated = (message = 'Authentication required.') =>
  new AppError(401, ErrorCode.UNAUTHENTICATED, message);

export const forbidden = (message = 'You do not have access to this resource.') =>
  new AppError(403, ErrorCode.FORBIDDEN, message);

export const notFound = (message = 'Resource not found.') =>
  new AppError(404, ErrorCode.NOT_FOUND, message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, ErrorCode.CONFLICT, message, details);

export const serviceUnavailable = (message: string) =>
  new AppError(503, ErrorCode.SERVICE_UNAVAILABLE, message);
