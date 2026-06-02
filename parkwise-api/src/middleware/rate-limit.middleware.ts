import rateLimit from 'express-rate-limit';
import { ErrorCode } from '../lib/errors';
import { sendError } from '../lib/api-response';
import { env } from '../config/env';

const limitHandler = (_req: unknown, res: import('express').Response): void => {
  sendError(res, 429, ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.');
};

// Per-IP rate limiting only makes sense in production. In development the Vite
// dev server proxies every request (changeOrigin), so the API sees a single IP
// (127.0.0.1) for the whole app — a shared bucket that produces false 429s and
// (because a 429 on /auth/me logs the user out) "random" logouts. So we apply
// strict limits only in production and stay lenient in dev/test.

// Stricter limiter for credential endpoints (login/register) to slow brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// General API limiter to protect against abusive bursts.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.isProduction ? 300 : 100_000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});
