import type { Response } from 'express';
import { env } from '../../config/env';

export const SESSION_COOKIE = 'pw_session';
export const CSRF_COOKIE = 'pw_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const baseCookie = {
  sameSite: 'lax' as const,
  secure: env.cookieSecure,
  path: '/',
};

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    ...baseCookie,
    httpOnly: true,
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { ...baseCookie, httpOnly: true });
}

/** CSRF token cookie is intentionally readable by JS (double-submit pattern). */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, {
    ...baseCookie,
    httpOnly: false,
  });
}
