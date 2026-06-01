import type { Response } from 'express';

/**
 * Standard API envelope used by every endpoint:
 *   success → { "success": true, "data": ... }
 *   failure → { "success": false, "error": { "code", "message", "details"? } }
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendOk<T>(res: Response, data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return res.status(status).json(body);
}
