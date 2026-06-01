import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE, CSRF_HEADER, setCsrfCookie } from '../lib/auth/cookies';
import { generateOpaqueToken, safeEqualHex } from '../lib/crypto';
import { forbidden } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Issue a CSRF token cookie on any request that lacks one. */
export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = generateOpaqueToken(24);
    setCsrfCookie(res, token);
    if (req.cookies) req.cookies[CSRF_COOKIE] = token;
  }
  next();
}

/**
 * Double-submit CSRF protection: state-changing requests must echo the CSRF
 * cookie value in the x-csrf-token header. Safe methods are exempt.
 */
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || !safeEqualHex(cookieToken, headerToken)) {
    next(forbidden('Invalid or missing CSRF token.'));
    return;
  }
  next();
}
