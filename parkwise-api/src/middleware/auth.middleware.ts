import type { NextFunction, Response } from 'express';
import { SESSION_COOKIE, setSessionCookie } from '../lib/auth/cookies';
import { renewSessionIfNeeded, resolveSession } from '../lib/auth/session';
import { forbidden, unauthenticated } from '../lib/errors';
import type { AuthenticatedRequest } from '../types/auth';
import type { AccountRole } from '../lib/rbac/roles';

/** Require a valid, active session. Attaches req.authUser. */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    const user = token ? await resolveSession(token) : null;
    if (!user) {
      next(unauthenticated());
      return;
    }
    if (user.accountStatus !== 'ACTIVE') {
      next(forbidden('Your account is suspended or inactive.'));
      return;
    }
    req.authUser = user;
    await slideSession(token!, user, res);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Sliding renewal: extend an active session past its halfway point and refresh
 * the cookie, so active users are never logged out mid-use. Best-effort — a
 * failure here never breaks the request (the session is still valid).
 */
async function slideSession(token: string, user: AuthenticatedRequest['authUser'], res: Response): Promise<void> {
  if (!user) return;
  try {
    const renewed = await renewSessionIfNeeded(user);
    if (renewed) setSessionCookie(res, token, renewed);
  } catch {
    /* ignore — renewal is best-effort */
  }
}

/** Attach req.authUser if a valid session exists, but allow guests through. */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const user = await resolveSession(token);
      if (user && user.accountStatus === 'ACTIVE') {
        req.authUser = user;
        await slideSession(token, user, res);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** Restrict to specific roles. Must be used after requireAuth. */
export function requireRole(...roles: AccountRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(unauthenticated());
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      next(forbidden('You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
