import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import * as authService from '../services/auth.service';
import { createSession, revokeSessionByToken } from '../lib/auth/session';
import { SESSION_COOKIE, clearSessionCookie, setSessionCookie } from '../lib/auth/cookies';
import { sendOk } from '../lib/api-response';
import type { AuthenticatedRequest } from '../types/auth';

async function startSession(req: Request, res: Response, user: User): Promise<void> {
  const { token, expiresAt } = await createSession(user.id, {
    userAgent: req.get('user-agent') ?? undefined,
    ipAddress: req.ip,
  });
  setSessionCookie(res, token, expiresAt);
}

export async function registerDriver(req: Request, res: Response): Promise<void> {
  const user = await authService.registerDriver(req.body);
  await startSession(req, res, user);
  sendOk(res, { user: await authService.buildMe(user.id) }, 201);
}

export async function registerOwner(req: Request, res: Response): Promise<void> {
  const user = await authService.registerOwner(req.body);
  await startSession(req, res, user);
  sendOk(res, { user: await authService.buildMe(user.id) }, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const user = await authService.authenticate(req.body);
  await startSession(req, res, user);
  sendOk(res, { user: await authService.buildMe(user.id) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await revokeSessionByToken(token);
  clearSessionCookie(res);
  sendOk(res, { loggedOut: true });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, { user: await authService.buildMe(req.authUser!.id) });
}
