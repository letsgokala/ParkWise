import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../types/app-error';
import { UserRole } from '../types/api.types';
import { AppJwtPayload, AuthenticatedRequest } from '../types/auth.types';

export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new AppError(401, 'Authentication required.');
    }

    req.user = jwt.verify(token, env.jwtSecret) as AppJwtPayload;
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Invalid or expired session.'));
  }
};

export const authorize = (roles: UserRole[]) => (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    next(new AppError(403, 'You do not have access to this resource.'));
    return;
  }

  next();
};
