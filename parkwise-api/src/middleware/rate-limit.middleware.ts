import rateLimit from 'express-rate-limit';
import { ErrorCode } from '../lib/errors';
import { sendError } from '../lib/api-response';
import { env } from '../config/env';

const limitHandler = (_req: unknown, res: import('express').Response): void => {
  sendError(res, 429, ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.');
};

// Stricter limiter for credential endpoints (login/register) to slow brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// General API limiter to protect against abusive bursts.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.isTest ? 100000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});
