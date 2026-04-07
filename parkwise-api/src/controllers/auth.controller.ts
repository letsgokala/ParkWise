import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types/auth.types';
import { AppError } from '../types/app-error';

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await authService.register(req.body);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await authService.login(req.body);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getCurrentUser(req.user!.uid);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const oauthStart = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider;
    const mode = typeof req.query.mode === 'string' ? req.query.mode : 'login';
    const role = typeof req.query.role === 'string' ? req.query.role : 'driver';
    const redirectUrl = authService.getOAuthAuthorizationUrl(provider, mode, role);
    res.redirect(redirectUrl);
  } catch (error) {
    const message = error instanceof AppError ? error.message : 'Failed to start OAuth sign-in.';
    res.redirect(authService.buildOAuthErrorRedirect(message));
  }
};

export const oauthCallback = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider;
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const redirectUrl = await authService.handleOAuthCallback(provider, code, state);
    res.redirect(redirectUrl);
  } catch (error) {
    const message = error instanceof AppError ? error.message : 'OAuth sign-in failed.';
    res.redirect(authService.buildOAuthErrorRedirect(message));
  }
};
