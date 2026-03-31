import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types/auth.types';

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
